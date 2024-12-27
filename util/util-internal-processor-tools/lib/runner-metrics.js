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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunnerMetrics = void 0;
const util_internal_1 = require("@subsquid/util-internal");
const util_internal_counters_1 = require("@subsquid/util-internal-counters");
const util_internal_range_1 = require("@subsquid/util-internal-range");
const util_1 = require("./util");
class RunnerMetrics {
    constructor(requests) {
        this.requests = requests;
        this.chainHeight = -1;
        this.lastBlock = -1;
        this.mappingSpeed = new util_internal_counters_1.Speed({ windowSize: 5 });
        this.mappingItemSpeed = new util_internal_counters_1.Speed({ windowSize: 5 });
        this.blockProgress = new util_internal_counters_1.Progress({ initialValue: 0 });
    }
    setChainHeight(height) {
        this.chainHeight = Math.max(height, this.lastBlock);
    }
    setLastProcessedBlock(height) {
        this.lastBlock = height;
        this.chainHeight = Math.max(this.chainHeight, this.lastBlock);
    }
    updateProgress(time) {
        let total = this.getEstimatedTotalBlocksCount();
        this.blockProgress.setTargetValue(total);
        this.blockProgress.setCurrentValue(total - this.getEstimatedBlocksLeft(), time);
    }
    registerBatch(batchSize, batchItemSize, batchMappingStartTime, batchMappingEndTime) {
        this.mappingSpeed.push(batchSize, batchMappingStartTime, batchMappingEndTime);
        this.mappingItemSpeed.push(batchItemSize || 1, batchMappingStartTime, batchMappingEndTime);
    }
    getRequestedBlockRanges() {
        let ranges = this.requests.map(req => req.range);
        (0, util_internal_range_1.assertRangeList)(ranges);
        return ranges;
    }
    getEstimatedTotalBlocksCount() {
        return (0, util_internal_range_1.getSize)(this.getRequestedBlockRanges(), {
            from: 0,
            to: Math.max(this.chainHeight, this.lastBlock)
        });
    }
    getEstimatedBlocksLeft() {
        let count = (0, util_internal_range_1.getSize)(this.getRequestedBlockRanges(), {
            from: this.lastBlock,
            to: Math.max(this.chainHeight, this.lastBlock)
        });
        return count == 1 ? 0 : count;
    }
    getChainHeight() {
        return this.chainHeight;
    }
    getLastProcessedBlock() {
        return this.lastBlock;
    }
    getSyncSpeed() {
        return this.blockProgress.speed();
    }
    getSyncEtaSeconds() {
        return this.blockProgress.eta();
    }
    getSyncRatio() {
        return this.blockProgress.ratio();
    }
    getMappingSpeed() {
        return this.mappingSpeed.speed();
    }
    getMappingItemSpeed() {
        return this.mappingItemSpeed.speed();
    }
    getStatusLine() {
        return `${this.lastBlock} / ${this.chainHeight}, ` +
            `rate: ${Math.round(this.getSyncSpeed())} blocks/sec, ` +
            `mapping: ${Math.round(this.getMappingSpeed())} blocks/sec, ` +
            `${Math.round(this.getMappingItemSpeed())} items/sec, ` +
            `eta: ${(0, util_1.timeInterval)(this.getSyncEtaSeconds())}`;
    }
}
exports.RunnerMetrics = RunnerMetrics;
__decorate([
    util_internal_1.def,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Array)
], RunnerMetrics.prototype, "getRequestedBlockRanges", null);
//# sourceMappingURL=runner-metrics.js.map