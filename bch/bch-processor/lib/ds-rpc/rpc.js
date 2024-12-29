import { createLogger } from '@subsquid/logger';
import { RpcError } from '@subsquid/rpc-client';
import { assertIsValid, BlockConsistencyError, trimInvalid } from '@subsquid/util-internal-ingest-tools';
import { rangeToArray } from '@subsquid/util-internal-range';
import { DataValidationError, nullable } from '@subsquid/util-internal-validation';
import { GetBlockNoTransactions, GetBlockWithTransactions, } from './rpc-data.js';
import { assertSuccess, binToHex, decodeTransaction, encodeCashAddress, hash160, hash256, hexToBin, lockingBytecodeToAddressContents } from '@bitauth/libauth';
import { LRUCache } from 'lru-cache';
import { Peer } from 'p2p-cash';
import { Graph } from './util.js';
const ZERO_HASH = "00".repeat(32);
function getResultValidator(validator, transformer) {
    return function (result) {
        if (transformer) {
            result = transformer(result);
        }
        let err = validator.validate(result);
        if (err) {
            throw new DataValidationError(`server returned unexpected result: ${err.toString()}`);
        }
        else {
            return result;
        }
    };
}
const transactionCache = new LRUCache({
    max: 1000,
});
const addressCache = new LRUCache({
    max: 1000,
});
// A composite class to get data from ElectrumX server (tip, historical transactions) and from p2p network layer (blocks, mempool)
// A variant of this class could be implemented to fetch data from a BCH node's RPC instead of ElectrumX
export class Rpc {
    client;
    log;
    validation;
    priority;
    props;
    p2pEndpoint;
    p2p;
    mempoolWatchCancel;
    newBlocksWatchCancel;
    constructor(client, log, validation = {}, priority = 0, props) {
        this.client = client;
        this.log = log;
        this.validation = validation;
        this.priority = priority;
        this.props = props ?? {};
        this.p2pEndpoint = this.props.p2pEndpoint ?? '3.142.98.179:8333';
        this.log = createLogger('sqd:processor:rpc', { rpcUrl: this.client.url, p2pEndpoint: this.p2pEndpoint });
    }
    setupP2P() {
        const [ip, port] = this.p2pEndpoint.split(':');
        const peer = new Peer({
            ticker: "BCH",
            node: ip,
            port: Number(port),
            validate: false,
            magic: Buffer.from("e3e1f3e8", "hex"),
            userAgent: "/subsquid/",
            version: 70012,
            listenRelay: true,
            timeoutConnect: 60 * 1000,
            reconnectTimeout: 100,
            autoReconnectWait: 100,
            autoReconnect: true,
            DEBUG_LOG: false,
            logger: this.log,
        });
        peer.on('connected', () => {
            this.log?.debug(`P2p peer: connected to node`);
        });
        peer.connect().catch(() => { });
        return peer;
    }
    async cleanupRpc() {
        await this.mempoolWatchCancel?.();
        this.p2p.disconnect(false);
    }
    async p2pReady() {
        this.p2p = this.setupP2P();
        if (!this.p2p.connected) {
            await new Promise(async (resolve) => {
                while (!this.p2p.connected) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
                resolve();
            });
        }
    }
    withPriority(priority) {
        return new Rpc(this.client, this.log, this.validation, priority, this.props);
    }
    async call(method, params, options) {
        if (method == 'blockchain.block.get') {
            await this.p2pReady();
            if (typeof params?.[0] === "number") {
                const result = await this.getBlockByHeightInternal(params[0], params[1]);
                return options?.validateResult ? options.validateResult(result, undefined) : result;
            }
            else if (typeof params?.[0] === "string") {
                const result = await this.getBlockByHashInternal(params[0], params[1], params[2]);
                return options?.validateResult ? options.validateResult(result, undefined) : result;
            }
        }
        return this.client.call(method, params, { priority: this.priority, ...options });
    }
    async batchCall(batch, options) {
        const indices = [];
        const [blockBatchHeights, blockBatchHashes, otherBatches] = batch.reduce((acc, b) => {
            if (b.method === 'blockchain.block.get' && typeof b.params?.[0] === "number") {
                indices.push(0);
                acc[0].push(b);
            }
            else if (b.method === 'blockchain.block.get' && typeof b.params?.[0] === "string") {
                indices.push(1);
                acc[1].push(b);
            }
            else {
                indices.push(2);
                acc[2].push(b);
            }
            return acc;
        }, [[], [], []]);
        if (blockBatchHashes.length || blockBatchHeights.length) {
            await this.p2pReady();
        }
        // allow rpc client to be blocked by priority
        const otherResults = await this.client.batchCall(otherBatches, { priority: this.priority, ...options });
        const blockResultHeights = await this.getBlockByHeightInternalBatch(blockBatchHeights.map(b => b.params[0]), blockBatchHeights.map(b => b.params[1]));
        const blockResultHashes = await this.getBlockByHashInternalBatch(blockBatchHashes.map(b => b.params[0]), blockBatchHashes.map(b => b.params[1]), blockBatchHeights.map(b => b.params[0]));
        const blockResultHeightsMaybeValidated = options?.validateResult ? blockResultHeights.map((r) => options.validateResult(r, undefined)) : blockResultHeights;
        const blockResultHashesMaybeValidated = options?.validateResult ? blockResultHashes.map((r) => options.validateResult(r, undefined)) : blockResultHashes;
        // restore the original order
        return indices.map((i) => {
            if (i === 0) {
                return blockResultHeightsMaybeValidated.shift();
            }
            else if (i === 1) {
                return blockResultHashesMaybeValidated.shift();
            }
            else {
                return otherResults.shift();
            }
        });
    }
    async watchMempool(requests, state, cb) {
        await this.p2pReady();
        await this.mempoolWatchCancel?.();
        const process = async (rawMempoolHashes) => {
            const rawMempool = await this.p2p.getRawTransactions(rawMempoolHashes);
            const transactions = rawMempool.map((tx, index) => transformTransaction(tx, -1, {
                hash: ZERO_HASH,
                height: -1,
            }, rawMempoolHashes[index].toString('hex')));
            const graph = new Graph();
            for (const tx of transactions) {
                for (const input of tx.inputs) {
                    graph.addEdge(input.outpointTransactionHash, tx.hash);
                }
            }
            const sortedTxHashes = graph.topologicalSort();
            const orderedTransactions = sortedTxHashes.map(txHash => transactions.find(tx => tx.hash === txHash)).filter(tx => tx !== undefined);
            if (requests.some(req => req.request.sourceOutputs || req.request.fields?.transaction?.sourceOutputs)) {
                await this.addSourceOutputs([{
                        height: -1, hash: ZERO_HASH,
                        block: { transactions: orderedTransactions },
                    }]);
                if (requests.some(req => req.request.fee || req.request.fields?.transaction?.fee)) {
                    await this.addFees([{
                            height: -1, hash: ZERO_HASH,
                            block: { transactions: orderedTransactions },
                        }]);
                }
            }
            await cb({
                blocks: [],
                baseHead: { hash: ZERO_HASH, height: -1 },
                finalizedHead: { hash: ZERO_HASH, height: -1 },
                mempoolTransactions: orderedTransactions
            });
        };
        const rawMempoolHashes = await this.p2p.getMempool();
        await process(rawMempoolHashes);
        const watchCancel = this.p2p.watchMempoolTransactionHashes(async (txHash) => {
            const rawMempoolHashes = [txHash];
            await process(rawMempoolHashes);
        });
        this.mempoolWatchCancel = async () => {
            watchCancel();
            this.mempoolWatchCancel = undefined;
        };
        return this.mempoolWatchCancel;
    }
    async watchNewBlocks(cb) {
        await this.p2pReady();
        await this.newBlocksWatchCancel?.();
        const watchCancel = this.p2p.watchNewBlocks(async (blockHash) => {
            const block = await this.p2p.getBlock(blockHash);
            cb({
                hash: block.getHash().toString("hex"),
                height: block.getHeight(),
                parentHash: block.header.prevHash.toString("hex"),
            });
        });
        this.mempoolWatchCancel = async () => {
            watchCancel();
            this.mempoolWatchCancel = undefined;
        };
        return this.mempoolWatchCancel;
    }
    getBlockByNumber(height, withTransactions) {
        return this.call('blockchain.block.get', [
            height,
            withTransactions ? 1.5 : 1
        ], {
            validateResult: getResultValidator(withTransactions ? nullable(GetBlockWithTransactions) : nullable(GetBlockNoTransactions), transformBlock(withTransactions))
        });
    }
    getBlockByHash(hash, withTransactions) {
        return this.call('blockchain.block.get', [hash, withTransactions ? 1.5 : 1], {
            validateResult: getResultValidator(withTransactions ? nullable(GetBlockWithTransactions) : nullable(GetBlockNoTransactions), transformBlock(withTransactions))
        });
    }
    getRawTransaction(hash) {
        return this.call('blockchain.transaction.get', [hash, false]);
    }
    async getTransaction(hash) {
        if (transactionCache.has(hash)) {
            return transactionCache.get(hash);
        }
        const tx = fromLibauthTransaction(assertSuccess(decodeTransaction(hexToBin(await this.getRawTransaction(hash)))));
        transactionCache.set(hash, tx);
        return tx;
    }
    async getBlockHash(height) {
        let block = await this.getBlockByNumber(height, false);
        return block?.hash;
    }
    async getHeight() {
        let { height } = await this.call('blockchain.headers.get_tip');
        return height;
    }
    async getColdBlock(blockHash, req, finalizedHeight) {
        let block = await this.getBlockByHash(blockHash, req?.transactions || false).then(toBlock);
        if (block == null)
            throw new BlockConsistencyError({ hash: blockHash });
        if (req) {
            await this.addRequestedData([block], req, finalizedHeight);
        }
        if (block._isInvalid)
            throw new BlockConsistencyError(block, block._errorMessage);
        return block;
    }
    async getColdSplit(req) {
        let blocks = await this.getColdBlockBatch(rangeToArray(req.range), req.request.transactions ?? false, 1);
        return this.addColdRequestedData(blocks, req.request, 1);
    }
    async addColdRequestedData(blocks, req, depth) {
        let result = blocks.map(b => ({ ...b }));
        await this.addRequestedData(result, req);
        if (depth > 9) {
            assertIsValid(result);
            return result;
        }
        let missing = [];
        for (let i = 0; i < result.length; i++) {
            if (result[i]._isInvalid) {
                missing.push(i);
            }
        }
        if (missing.length == 0)
            return result;
        let missed = await this.addColdRequestedData(missing.map(i => blocks[i]), req, depth + 1);
        for (let i = 0; i < missing.length; i++) {
            result[missing[i]] = missed[i];
        }
        return result;
    }
    async getColdBlockBatch(numbers, withTransactions, depth) {
        let result = await this.getBlockBatch(numbers, withTransactions);
        let missing = [];
        for (let i = 0; i < result.length; i++) {
            if (result[i] == null) {
                missing.push(i);
            }
        }
        if (missing.length == 0)
            return result;
        if (depth > 9)
            throw new BlockConsistencyError({
                height: numbers[missing[0]]
            }, `failed to get finalized block after ${depth} attempts`);
        let missed = await this.getColdBlockBatch(missing.map(i => numbers[i]), withTransactions, depth + 1);
        for (let i = 0; i < missing.length; i++) {
            result[missing[i]] = missed[i];
        }
        return result;
    }
    async getHotSplit(req) {
        let blocks = await this.getBlockBatch(rangeToArray(req.range), req.request.transactions ?? false);
        let chain = [];
        for (let i = 0; i < blocks.length; i++) {
            let block = blocks[i];
            if (block == null)
                break;
            if (i > 0 && chain[i - 1].hash !== block.block.parentHash)
                break;
            chain.push(block);
        }
        await this.addRequestedData(chain, req.request, req.finalizedHeight);
        return trimInvalid(chain);
    }
    async getBlockBatch(numbers, withTransactions) {
        let call = numbers.map(height => {
            return {
                method: 'blockchain.block.get',
                params: [height, withTransactions ? 1.5 : 1]
            };
        });
        let blocks = await this.batchCall(call, {
            validateResult: getResultValidator(withTransactions ? nullable(GetBlockWithTransactions) : nullable(GetBlockNoTransactions), transformBlock(withTransactions)),
            validateError: info => {
                // Avalanche
                if (/cannot query unfinalized data/i.test(info.message))
                    return null;
                throw new RpcError(info);
            }
        });
        return blocks.map(toBlock);
    }
    async addRequestedData(blocks, req, finalizedHeight) {
        if (blocks.length == 0)
            return;
        let subtasks = [];
        if (req.sourceOutputs || req.fields?.transaction?.sourceOutputs) {
            subtasks.push(this.addSourceOutputs(blocks));
            if (req.fee || req.fields?.transaction?.fee) {
                subtasks.at(-1).then(() => this.addFees(blocks));
            }
        }
        await Promise.all(subtasks);
    }
    async addSourceOutputs(blocks) {
        if (blocks.length == 0)
            return;
        if (blocks.some((block => block.block.transactions.some(tx => typeof tx === "string")))) {
            return;
        }
        // get all unique prevout txIds excluding the coinbase tx
        const txIds = [...new Set(blocks.map(block => block.block.transactions.map(tx => tx.inputs.map(input => input.outpointTransactionHash))).flat(3))].filter(txId => txId !== ZERO_HASH && !transactionCache.has(txId, { updateAgeOnHas: true }));
        console.log(`addSourceOutputs for blocks: ${blocks.map(b => b.height).join(', ')}. txIds: ${txIds.length}`);
        console.time(`addSourceOutputs for blocks: ${blocks.map(b => b.height).join(', ')}. txIds: ${txIds.length}`);
        if (true) {
            // batched to reduce network overhead
            const txIdsToFetch = txIds.filter(txId => !transactionCache.has(txId));
            const rawTxs = await this.batchCall(txIdsToFetch.map(txId => ({
                method: 'blockchain.transaction.get',
                params: [txId, false]
            })));
            rawTxs.map((rawTx, index) => {
                const tx = fromLibauthTransaction(assertSuccess(decodeTransaction(hexToBin(rawTx))));
                transactionCache.set(txIdsToFetch[index], tx);
            });
        }
        else {
            // sequential to avoid batch limiting
            await Promise.all(txIds.map(async (txId) => {
                if (transactionCache.has(txId)) {
                    return;
                }
                const tx = fromLibauthTransaction(assertSuccess(decodeTransaction(hexToBin(await this.getRawTransaction(txId)))));
                transactionCache.set(txId, tx);
            }));
        }
        for (const block of blocks) {
            for (const transaction of block.block.transactions) {
                const tx = transaction;
                if (tx.transactionIndex === 0) {
                    tx.sourceOutputs = undefined;
                }
                else {
                    const txIdsToFetch = tx.inputs.filter(input => !transactionCache.has(input.outpointTransactionHash)).map(input => input.outpointTransactionHash);
                    const rawTxs = await this.batchCall(txIdsToFetch.map(txId => ({
                        method: 'blockchain.transaction.get',
                        params: [txId, false]
                    })));
                    rawTxs.map((rawTx, index) => {
                        const tx = fromLibauthTransaction(assertSuccess(decodeTransaction(hexToBin(rawTx))));
                        transactionCache.set(txIdsToFetch[index], tx);
                    });
                    tx.sourceOutputs = await Promise.all(tx.inputs.map(async (input) => {
                        const txId = input.outpointTransactionHash;
                        let cachedTx = transactionCache.get(txId);
                        if (!cachedTx) {
                            console.error(txId, "not found in cache");
                            // const tx = assertSuccess(decodeTransaction(hexToBin(await this.getRawTransaction(txId)))) as TransactionBCHWithAddress;
                            // transactionCache.set(txId, tx);
                            // cachedTx = tx;
                        }
                        return cachedTx.outputs[input.outpointIndex];
                    }));
                }
            }
        }
        console.timeEnd(`addSourceOutputs for blocks: ${blocks.map(b => b.height).join(', ')}. txIds: ${txIds.length}`);
    }
    async addFees(blocks) {
        if (blocks.length == 0)
            return;
        if (blocks.some((block => block.block.transactions.some(tx => typeof tx === "string")))) {
            return;
        }
        this.log?.debug(`addFees for blocks: ${blocks.map(b => b.height).join(', ')}`);
        for (const block of blocks) {
            for (const transaction of block.block.transactions) {
                const tx = transaction;
                if (tx.transactionIndex === 0) {
                    tx.fee = 0;
                }
                else {
                    const sumInputs = tx.sourceOutputs.reduce((acc, input) => acc + input.valueSatoshis, 0n);
                    const sumOutputs = tx.outputs.reduce((acc, output) => acc + output.valueSatoshis, 0n);
                    tx.fee = Number(sumInputs - sumOutputs);
                }
            }
        }
    }
    async getBlockByHeightInternal(blockHeight, verbosity) {
        const { height, hex } = await this.call("blockchain.header.get", [blockHeight]);
        const hash = binToHex(hash256(hexToBin(hex)).reverse());
        return await this.getBlockByHashInternal(hash, verbosity, height);
    }
    async getBlockByHeightInternalBatch(blockHeights, verbosities) {
        if (blockHeights.length === 0)
            return [];
        const batch = blockHeights.map((blockHeight) => {
            return {
                method: 'blockchain.header.get',
                params: [blockHeight]
            };
        });
        const result = await this.batchCall(batch);
        return await this.getBlockByHashInternalBatch(result.map(({ hex }) => binToHex(hash256(hexToBin(hex)).reverse())), verbosities, result.map(({ height }) => height));
    }
    async getBlockHeightByHashInternal(blockHash) {
        const { height } = await this.call("blockchain.header.get", [blockHash]);
        return height;
    }
    async mapToRpcBlock(blockHash, block, verbosity, height) {
        if (!verbosity || Number(verbosity) === 0) {
            const result = block.toBuffer().toString("hex");
            return result;
        }
        else if (Number(verbosity === 1) || Number(verbosity === 1.5)) {
            height = height ?? (() => {
                try {
                    return block.getHeight();
                }
                catch (e) {
                    return undefined;
                }
            })() ?? await this.getBlockHeightByHashInternal(blockHash);
            const result = {
                hash: block.getHash().toString("hex"),
                confirmations: -1,
                size: block.size,
                height: height,
                version: block.header.version.slice().readUint32BE(0),
                versionHex: block.header.version.toString("hex"),
                merkleroot: block.header.merkleRoot.toString("hex"),
                tx: [],
                time: block.header.time,
                mediantime: 0,
                nonce: block.header.nonce,
                bits: block.header.bits.toString("hex"),
                difficulty: 0,
                nTx: block.txCount,
                previousblockhash: block.header.prevHash.toString("hex"),
                nextblockhash: "",
            };
            const rawTransactions = block.getRawTransactions();
            if (Number(verbosity === 1)) {
                result.tx = rawTransactions.map(tx => binToHex(hash256(tx).reverse()));
            }
            else {
                result.tx = rawTransactions.map(tx => tx.toString("hex"));
            }
            return result;
        }
        return null;
    }
    async getBlockByHashInternalBatch(blockHashes, verbosities, heights) {
        if (blockHashes.length === 0)
            return [];
        const blocks = await this.p2p.getBlocks(blockHashes.map(blockHash => Buffer.from(blockHash, "hex")));
        return await Promise.all(blocks.map((block, index) => this.mapToRpcBlock(blockHashes[index], block, verbosities[index], heights?.[index])));
    }
    async getBlockByHashInternal(blockHash, verbosity, height) {
        const block = await this.p2p.getBlock(Buffer.from(blockHash, "hex"));
        return await this.mapToRpcBlock(blockHash, block, verbosity, height);
    }
}
function toBlock(getBlock) {
    if (getBlock == null)
        return;
    return {
        height: getBlock.height,
        hash: getBlock.hash,
        block: getBlock
    };
}
const transformBlock = (withTransactions) => (rpcBlock) => {
    if (rpcBlock === null)
        return null;
    return {
        height: rpcBlock.height,
        hash: rpcBlock.hash,
        parentHash: rpcBlock.previousblockhash,
        transactions: (withTransactions ? rpcBlock.tx.map((txHex, index) => transformTransaction(txHex, index, rpcBlock)) : rpcBlock.tx),
        difficulty: rpcBlock.difficulty,
        size: rpcBlock.size,
        timestamp: rpcBlock.time,
        nonce: rpcBlock.nonce,
    };
};
const fromLibauthTransaction = (tx) => {
    return {
        ...tx,
        inputs: tx.inputs.map(input => ({
            ...input,
            outpointTransactionHash: binToHex(input.outpointTransactionHash),
            unlockingBytecode: binToHex(input.unlockingBytecode),
        })),
        outputs: tx.outputs.map(output => ({
            ...output,
            address: getAddress(output.lockingBytecode),
            lockingBytecode: binToHex(output.lockingBytecode),
            token: output.token ? {
                category: binToHex(output.token.category),
                amount: output.token.amount,
                nft: output.token.nft ? {
                    commitment: binToHex(output.token.nft.commitment),
                    capability: output.token.nft.capability,
                } : undefined,
            } : undefined,
        }))
    };
};
const getAddress = (lockingBytecode) => {
    if (addressCache.has(lockingBytecode)) {
        return addressCache.get(lockingBytecode);
    }
    const contents = lockingBytecodeToAddressContents(lockingBytecode);
    const encodeResult = encodeCashAddress({
        prefix: process.env.BCH_PREFIX,
        type: contents.type.toLowerCase(),
        payload: contents.type === 'P2PK' ? hash160(contents.payload) : contents.payload,
        throwErrors: false
    });
    return typeof encodeResult === "string" ? binToHex(contents.payload) : encodeResult.address;
};
const transformTransaction = (txHexOrBin, txIndex, rpcBlock, txHash) => {
    const rawTx = typeof txHexOrBin === "string" ? hexToBin(txHexOrBin) : txHexOrBin;
    const tx = fromLibauthTransaction(assertSuccess(decodeTransaction(rawTx)));
    txHash ??= binToHex(hash256(rawTx).reverse());
    transactionCache.set(txHash, tx);
    return {
        hash: txHash,
        blockHash: rpcBlock.hash,
        blockNumber: rpcBlock.height,
        transactionIndex: txIndex,
        size: rawTx.length,
        ...tx
    };
};
//# sourceMappingURL=rpc.js.map