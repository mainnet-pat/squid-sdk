import { LogLevel } from '@subsquid/logger';
import { AsyncQueue, ensureError, last, maybeLast, Throttler, wait } from '@subsquid/util-internal';
import { BlockConsistencyError, coldIngest, HotProcessor, isDataConsistencyError } from '@subsquid/util-internal-ingest-tools';
import { getRequestAt, mapRangeRequestList, rangeEnd, splitRange, splitRangeByRequest } from '@subsquid/util-internal-range';
import { cast, NAT, object } from '@subsquid/util-internal-validation';
import { addTimeout, TimeoutError } from '@subsquid/util-timeout';
import assert from 'assert';
import { mapBlock } from './mapping.js';
import { toMappingRequest } from './request.js';
import { Rpc } from './rpc.js';
import { HEX } from './rpc-data.js';
const NO_REQUEST = toMappingRequest();
export class BchRpcDataSource {
    rpc;
    finalityConfirmation;
    headPollInterval;
    newHeadTimeout;
    log;
    constructor(options) {
        this.log = options.log;
        this.rpc = new Rpc(options.rpc, this.log, options.validationFlags, 0, { p2pEndpoint: options.p2pEndpoint });
        this.finalityConfirmation = options.finalityConfirmation;
        this.headPollInterval = options.headPollInterval || 5_000;
        this.newHeadTimeout = options.newHeadTimeout || 0;
    }
    async getFinalizedHeight() {
        let height = await this.rpc.getHeight();
        return Math.max(0, height - this.finalityConfirmation);
    }
    getBlockHash(height) {
        return this.rpc.getBlockHash(height);
    }
    getFinalizedBlocks(requests, stopOnHead) {
        return coldIngest({
            getFinalizedHeight: () => this.getFinalizedHeight(),
            getSplit: req => this._getColdSplit(req),
            requests: mapRangeRequestList(requests, req => this.toMappingRequest(req)),
            splitSize: 10,
            concurrency: Math.min(5, this.rpc.client.getConcurrency()),
            stopOnHead,
            headPollInterval: this.headPollInterval
        });
    }
    async _getColdSplit(req) {
        let rpc = this.rpc.withPriority(req.range.from);
        let blocks = await rpc.getColdSplit(req).catch(err => {
            if (isDataConsistencyError(err)) {
                err.message += '. Perhaps finality confirmation was not large enough';
            }
            throw err;
        });
        await rpc.cleanupRpc();
        return blocks.map(b => mapBlock(b, req.request));
    }
    toMappingRequest(req) {
        let r = toMappingRequest(req);
        return r;
    }
    async processHotBlocks(requests, state, cb) {
        if (requests.length == 0)
            return;
        let mappingRequests = mapRangeRequestList(requests, req => this.toMappingRequest(req));
        let self = this;
        let proc = new HotProcessor(state, {
            process: cb,
            getBlock: async (ref) => {
                let req = getRequestAt(mappingRequests, ref.height) || NO_REQUEST;
                let block = await this.rpc.getColdBlock(ref.hash, req, proc.getFinalizedHeight());
                return mapBlock(block, req);
            },
            async *getBlockRange(from, to) {
                assert(to.height != null);
                if (from > to.height) {
                    from = to.height;
                }
                for (let split of splitRangeByRequest(mappingRequests, { from, to: to.height })) {
                    let request = split.request || NO_REQUEST;
                    for (let range of splitRange(10, split.range)) {
                        let rpcBlocks = await self.rpc.getHotSplit({
                            range,
                            request,
                            finalizedHeight: proc.getFinalizedHeight()
                        });
                        let blocks = rpcBlocks.map(b => mapBlock(b, request));
                        let lastBlock = maybeLast(blocks)?.header.height ?? range.from - 1;
                        yield blocks;
                        if (lastBlock < range.to) {
                            throw new BlockConsistencyError({ height: lastBlock + 1 });
                        }
                    }
                }
            },
            getHeader(block) {
                return block.header;
            }
        });
        let isEnd = () => proc.getFinalizedHeight() >= rangeEnd(last(requests).range);
        let navigate = (head) => {
            return proc.goto({
                best: head,
                finalized: {
                    height: Math.max(head.height - this.finalityConfirmation, 0)
                }
            });
        };
        if (this.rpc.client.supportsNotifications()) {
            return this.subscription(navigate, isEnd);
        }
        else {
            return this.polling(navigate, isEnd);
        }
    }
    async processMempool(requests, state, cb) {
        return await this.rpc.watchMempool(requests, state, cb);
    }
    async polling(cb, isEnd) {
        let prev = -1;
        let height = new Throttler(() => this.rpc.getHeight(), this.headPollInterval);
        while (!isEnd()) {
            let next = await height.call();
            if (next <= prev)
                continue;
            prev = next;
            for (let i = 0; i < 100; i++) {
                try {
                    await cb({ height: next });
                    break;
                }
                catch (err) {
                    if (isDataConsistencyError(err)) {
                        this.log?.write(i > 0 ? LogLevel.WARN : LogLevel.DEBUG, err.message);
                        await wait(100);
                    }
                    else {
                        throw err;
                    }
                }
            }
        }
    }
    async subscription(cb, isEnd) {
        let lastHead = { height: -1, hash: '0x' };
        let heads = await this.subscribeNewHeads();
        try {
            while (!isEnd()) {
                let next = await addTimeout(heads.take(), this.newHeadTimeout).catch(ensureError);
                assert(next);
                if (next instanceof TimeoutError) {
                    this.log?.warn(`resetting RPC connection, because we haven't seen a new head for ${this.newHeadTimeout} ms`);
                    this.rpc.client.reset();
                }
                else if (next instanceof Error) {
                    throw next;
                }
                else if (next.height >= lastHead.height) {
                    lastHead = next;
                    for (let i = 0; i < 3; i++) {
                        try {
                            await cb(next);
                            break;
                        }
                        catch (err) {
                            if (isDataConsistencyError(err)) {
                                this.log?.write(i > 0 ? LogLevel.WARN : LogLevel.DEBUG, err.message);
                                await wait(100);
                                if (heads.peek())
                                    break;
                            }
                            else {
                                throw err;
                            }
                        }
                    }
                }
            }
        }
        finally {
            heads.close();
        }
    }
    async subscribeNewHeads() {
        let queue = new AsyncQueue(1);
        const unsubscribe = await this.rpc.watchNewBlocks(async (head) => {
            try {
                let { height, hash, parentHash } = cast(NewHeadMessage, head);
                queue.forcePut({
                    height,
                    hash,
                    parentHash
                });
            }
            catch (err) {
                queue.forcePut(ensureError(err));
                queue.close();
            }
        });
        queue.addCloseListener(async () => await unsubscribe());
        return queue;
    }
}
const NewHeadMessage = object({
    height: NAT,
    hash: HEX,
    parentHash: HEX
});
//# sourceMappingURL=client.js.map