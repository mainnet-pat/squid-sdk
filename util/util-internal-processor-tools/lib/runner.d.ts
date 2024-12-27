import type { Logger } from '@subsquid/logger';
import { RangeRequest } from '@subsquid/util-internal-range';
import { Database } from './database';
import { Batch, Block, DataSource, HotDataSource } from './datasource';
import { PrometheusServer } from './prometheus';
export interface RunnerConfig<R, S> {
    archive?: DataSource<Block, R>;
    hotDataSource?: HotDataSource<Block, R>;
    allBlocksAreFinal?: boolean;
    process: (store: S, batch: Batch<Block>) => Promise<void>;
    requests: RangeRequest<R>[];
    database: Database<S>;
    log: Logger;
    prometheus: PrometheusServer;
    watchMempool?: boolean;
}
export declare class Runner<R, S> {
    private config;
    private metrics;
    private statusReportTimer?;
    private hasStatusNews;
    private startedWatchingMempool;
    private cancelMempoolWatch?;
    constructor(config: RunnerConfig<R, S>);
    run(): Promise<void>;
    private assertWeAreOnTheSameChain;
    private processFinalizedBlocks;
    private handleFinalizedBlocks;
    private processHotBlocks;
    private processMempool;
    private chainHeightUpdateLoop;
    private withProgressMetrics;
    private reportStatus;
    private initMetrics;
    private getLeftRequests;
    private getDatabaseState;
    private printProcessingRange;
    private printProcessingMessage;
    private startPrometheusServer;
    private get log();
}
//# sourceMappingURL=runner.d.ts.map