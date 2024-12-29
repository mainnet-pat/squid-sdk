import { Logger } from '@subsquid/logger';
import { RpcClient } from '@subsquid/rpc-client';
import { Batch, HotDatabaseState, HotDataSource, HotUpdate } from '@subsquid/util-internal-processor-tools';
import { RangeRequest, RangeRequestList } from '@subsquid/util-internal-range';
import { Bytes32 } from '../interfaces/base.js';
import { DataRequest } from '../interfaces/data-request.js';
import { Block } from '../mapping/entities.js';
import { Rpc, RpcValidationFlags } from './rpc.js';
export interface BchRpcDataSourceOptions {
    rpc: RpcClient;
    p2pEndpoint?: string;
    finalityConfirmation: number;
    newHeadTimeout?: number;
    headPollInterval?: number;
    log?: Logger;
    validationFlags?: RpcValidationFlags;
}
export declare class BchRpcDataSource implements HotDataSource<Block, DataRequest> {
    rpc: Rpc;
    private finalityConfirmation;
    private headPollInterval;
    private newHeadTimeout;
    private log?;
    constructor(options: BchRpcDataSourceOptions);
    getFinalizedHeight(): Promise<number>;
    getBlockHash(height: number): Promise<Bytes32 | undefined>;
    getFinalizedBlocks(requests: RangeRequest<DataRequest>[], stopOnHead?: boolean): AsyncIterable<Batch<Block>>;
    private _getColdSplit;
    private toMappingRequest;
    processHotBlocks(requests: RangeRequestList<DataRequest>, state: HotDatabaseState, cb: (upd: HotUpdate<Block>) => Promise<void>): Promise<void>;
    processMempool(requests: RangeRequestList<DataRequest>, state: HotDatabaseState, cb: (upd: HotUpdate<Block>) => Promise<void>): Promise<() => Promise<void>>;
    private polling;
    private subscription;
    private subscribeNewHeads;
}
//# sourceMappingURL=client.d.ts.map