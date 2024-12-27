"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Runner = void 0;
const util_internal_1 = require("@subsquid/util-internal");
const util_internal_range_1 = require("@subsquid/util-internal-range");
const assert_1 = __importDefault(require("assert"));
const runner_metrics_1 = require("./runner-metrics");
const util_1 = require("./util");
class Runner {
    constructor(config) {
        this.config = config;
        this.hasStatusNews = false;
        this.startedWatchingMempool = false;
        this.metrics = new runner_metrics_1.RunnerMetrics(this.config.requests);
        this.config.prometheus.addRunnerMetrics(this.metrics);
    }
    async run() {
        let log = this.config.log;
        let state = await this.getDatabaseState();
        if (state.height >= 0) {
            log.info(`last processed final block was ${state.height}`);
            log.debug(`clearing mempool state`);
            await this.config.database.clearMempool();
        }
        if (this.getLeftRequests(state).length == 0) {
            this.printProcessingRange();
            log.info('nothing to do');
            return;
        }
        this.printProcessingMessage(state);
        const archive = this.config.archive;
        const hot = this.config.hotDataSource;
        if (archive) {
            let archiveHeight = await archive.getFinalizedHeight();
            if (archiveHeight > state.height + state.top.length || hot == null) {
                this.log.info('using archive data source');
                await this.assertWeAreOnTheSameChain(archive, state);
                await this.initMetrics(archiveHeight, state);
                state = await this.processFinalizedBlocks({
                    state,
                    src: archive,
                    shouldStopOnHead: !!hot
                }).finally(this.chainHeightUpdateLoop(archive));
                if (this.getLeftRequests(state).length == 0)
                    return;
            }
        }
        (0, assert_1.default)(hot);
        this.log.info('using chain RPC data source');
        await this.assertWeAreOnTheSameChain(hot, state);
        let chainFinalizedHeight = await hot.getFinalizedHeight();
        await this.initMetrics(chainFinalizedHeight, state);
        if (chainFinalizedHeight > state.height + state.top.length) {
            state = await this.processFinalizedBlocks({
                state,
                src: hot,
                shouldStopOnHead: this.config.database.supportsHotBlocks && !this.config.allBlocksAreFinal
            }).finally(this.chainHeightUpdateLoop(hot));
            if (this.getLeftRequests(state).length == 0)
                return;
        }
        else {
            await this.processMempool(state);
        }
        if (chainFinalizedHeight > state.height + state.top.length) {
            // finalized block processing haven't kicked in during previous steps
            // this can happen if the next requested block is above the finalized head.
            // We'll advance the processor in order to:
            //   1. guarantee, that the state passed to `hot.getHotBlocks()` is a real block reference
            //      rather than a dummy `{height: -1, hash: '0x'}`.
            //   2. ease a work of `hot.getHotBlocks()`, which is likely not optimized for such case
            let nextRequestedBlock = this.getLeftRequests(state)[0].range.from;
            (0, assert_1.default)(nextRequestedBlock > chainFinalizedHeight);
            let nextState = {
                height: chainFinalizedHeight,
                hash: (0, util_internal_1.assertNotNull)(await hot.getBlockHash(chainFinalizedHeight), `finalized block ${chainFinalizedHeight} is not found in the data source`),
                top: []
            };
            await this.config.database.transact({
                prevHead: state,
                nextHead: nextState,
                isOnTop: true
            }, async () => { });
            state = nextState;
        }
        return this.processHotBlocks(state).finally(async () => {
            this.chainHeightUpdateLoop(hot);
        });
    }
    async assertWeAreOnTheSameChain(src, state) {
        if (state.height < 0)
            return;
        if (state.hash === '0x') {
            this.log.warn('seems like we are migrating from the FireSquid, ' +
                'this can only work if the next block to index was already finalized ' +
                'or we are not indexing hot blocks at all');
            return;
        }
        let hash = await src.getBlockHash(state.height);
        if (state.hash !== hash) {
            throw new Error(`already indexed block ${(0, util_1.formatHead)(state)} was not found on chain`);
        }
    }
    async processFinalizedBlocks(args) {
        let state = args.state;
        let minimumCommitHeight = state.height + state.top.length;
        let prevBatch;
        for await (let batch of args.src.getFinalizedBlocks(this.getLeftRequests(args.state), args.shouldStopOnHead)) {
            if (prevBatch) {
                batch = {
                    blocks: prevBatch.blocks.concat(batch.blocks),
                    isHead: batch.isHead,
                    mempoolTransactions: [],
                };
            }
            if ((0, util_internal_1.last)(batch.blocks).header.height < minimumCommitHeight) {
                prevBatch = batch;
            }
            else {
                prevBatch = undefined;
                state = await this.handleFinalizedBlocks(state, batch);
            }
        }
        if (prevBatch) {
            state = await this.handleFinalizedBlocks(state, prevBatch);
        }
        return state;
    }
    async handleFinalizedBlocks(state, batch) {
        await this.cancelMempoolWatch?.();
        let lastBlock = (0, util_internal_1.last)(batch.blocks);
        (0, assert_1.default)(state.height < lastBlock.header.height);
        let nextState = {
            height: lastBlock.header.height,
            hash: lastBlock.header.hash,
            top: []
        };
        await this.withProgressMetrics(batch.blocks, () => {
            return this.config.database.transact({
                prevHead: state,
                nextHead: nextState,
                isOnTop: batch.isHead
            }, store => {
                return this.config.process(store, batch);
            });
        });
        const isHead = nextState.height === this.metrics.getChainHeight();
        if (isHead && !this.startedWatchingMempool && this.config.watchMempool) {
            await this.processMempool(state);
        }
        return nextState;
    }
    async processHotBlocks(state) {
        (0, assert_1.default)(this.config.database.supportsHotBlocks);
        let db = this.config.database;
        let ds = (0, util_internal_1.assertNotNull)(this.config.hotDataSource);
        let lastHead = (0, util_internal_1.maybeLast)(state.top) || state;
        return ds.processHotBlocks(this.getLeftRequests(state), state, async (upd) => {
            await this.cancelMempoolWatch?.();
            let newHead = (0, util_internal_1.maybeLast)(upd.blocks)?.header || upd.baseHead;
            if (upd.baseHead.hash !== lastHead.hash) {
                this.log.info(`navigating a fork between ${(0, util_1.formatHead)(lastHead)} to ${(0, util_1.formatHead)(newHead)} with a common base ${(0, util_1.formatHead)(upd.baseHead)}`);
            }
            this.log.debug({ hotUpdate: upd });
            let info = {
                finalizedHead: upd.finalizedHead,
                baseHead: upd.baseHead,
                newBlocks: upd.blocks.map(b => b.header)
            };
            await this.withProgressMetrics(upd.blocks, () => {
                if (db.transactHot2) {
                    return db.transactHot2(info, (store, blockSliceStart, blockSliceEnd) => {
                        return this.config.process(store, {
                            blocks: upd.blocks.slice(blockSliceStart, blockSliceEnd),
                            isHead: blockSliceEnd === upd.blocks.length,
                            mempoolTransactions: []
                        });
                    });
                }
                else {
                    return db.transactHot(info, (store, ref) => {
                        let idx = ref.height - upd.baseHead.height - 1;
                        let block = upd.blocks[idx];
                        assert_1.default.strictEqual(block.header.hash, ref.hash);
                        assert_1.default.strictEqual(block.header.height, ref.height);
                        return this.config.process(store, {
                            blocks: [block],
                            isHead: newHead.height === ref.height,
                            mempoolTransactions: []
                        });
                    });
                }
            });
            lastHead = newHead;
            const isHead = newHead.height === this.metrics.getChainHeight();
            if (isHead && !this.startedWatchingMempool && this.config.watchMempool) {
                await this.processMempool(state);
            }
        });
    }
    async processMempool(state) {
        (0, assert_1.default)(this.startedWatchingMempool === false);
        this.startedWatchingMempool = true;
        (0, assert_1.default)(this.config.database.supportsHotBlocks);
        (0, assert_1.default)(this.config.watchMempool);
        let db = this.config.database;
        let ds = (0, util_internal_1.assertNotNull)(this.config.hotDataSource);
        this.log.debug("started watching mempool");
        const cancel = await ds.processMempool?.(this.getLeftRequests(state), state, async (upd) => {
            return db.transactMempool((store) => {
                return this.config.process(store, {
                    blocks: [],
                    isHead: true,
                    mempoolTransactions: upd.mempoolTransactions,
                });
            });
        });
        this.cancelMempoolWatch = async () => {
            this.log.debug(`stopped watching mempool`);
            this.startedWatchingMempool = false;
            this.cancelMempoolWatch = undefined;
            await cancel?.();
            await this.config.database.clearMempool();
        };
    }
    chainHeightUpdateLoop(src) {
        let abort = new AbortController();
        let loop = async () => {
            while (!abort.signal.aborted) {
                await (0, util_internal_1.wait)(20000, abort.signal);
                let newHeight = await src.getFinalizedHeight().catch(err => {
                    if (!abort.signal.aborted) {
                        this.log.error(err, 'failed to check chain height');
                    }
                    return this.metrics.getChainHeight();
                });
                this.metrics.setChainHeight(newHeight);
            }
        };
        loop().catch(err => {
            if (!abort.signal.aborted) {
                this.log.error(err, 'chain height metric update loop failed');
            }
        });
        return () => abort.abort();
    }
    async withProgressMetrics(blocks, handler) {
        let mappingStartTime = process.hrtime.bigint();
        let result = await handler();
        let mappingEndTime = process.hrtime.bigint();
        if (blocks.length > 0) {
            this.metrics.setLastProcessedBlock((0, util_internal_1.last)(blocks).header.height);
            this.metrics.updateProgress(mappingEndTime);
            this.metrics.registerBatch(blocks.length, (0, util_1.getItemsCount)(blocks), mappingStartTime, mappingEndTime);
        }
        this.reportStatus();
        return result;
    }
    reportStatus() {
        if (this.statusReportTimer == null) {
            this.log.info(this.metrics.getStatusLine());
            this.statusReportTimer = setTimeout(() => {
                this.statusReportTimer = undefined;
                if (this.hasStatusNews) {
                    this.hasStatusNews = false;
                    this.reportStatus();
                }
            }, 5000);
        }
        else {
            this.hasStatusNews = true;
        }
    }
    async initMetrics(chainHeight, state) {
        let initialized = this.metrics.getChainHeight() >= 0;
        this.metrics.setChainHeight(chainHeight);
        if (initialized)
            return;
        this.metrics.setLastProcessedBlock(state.height + state.top.length);
        this.metrics.updateProgress();
        return this.startPrometheusServer();
    }
    getLeftRequests(after) {
        return (0, util_internal_range_1.applyRangeBound)(this.config.requests, { from: after.height + 1 });
    }
    getDatabaseState() {
        if (this.config.database.supportsHotBlocks) {
            return this.config.database.connect();
        }
        else {
            return this.config.database.connect().then(head => {
                return { ...head, top: [] };
            });
        }
    }
    printProcessingRange() {
        if (this.config.requests.length == 0)
            return;
        let requests = this.config.requests;
        this.log.info(`processing range is [${requests[0].range.from}, ${(0, util_internal_1.last)(requests).range.to}]`);
    }
    printProcessingMessage(state) {
        let from = Math.max(state.height + 1, this.config.requests[0].range.from);
        let end = (0, util_internal_range_1.rangeEnd)((0, util_internal_1.last)(this.config.requests).range);
        let msg = `processing blocks from ${from}`;
        if (Number.isSafeInteger(end)) {
            msg += ' to ' + end;
        }
        this.log.info(msg);
    }
    async startPrometheusServer() {
        let prometheusServer = await this.config.prometheus.serve();
        this.log.info(`prometheus metrics are served at port ${prometheusServer.port}`);
    }
    get log() {
        return this.config.log;
    }
}
exports.Runner = Runner;
__decorate([
    util_internal_1.def,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Runner.prototype, "run", null);
__decorate([
    util_internal_1.def,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Runner.prototype, "startPrometheusServer", null);
//# sourceMappingURL=runner.js.map