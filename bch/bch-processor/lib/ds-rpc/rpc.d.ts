import { Logger } from '@subsquid/logger';
import { CallOptions, RpcClient } from '@subsquid/rpc-client';
import { BlockHeader } from '@subsquid/util-internal-ingest-tools';
import { RangeRequestList, SplitRequest } from '@subsquid/util-internal-range';
import { Bytes, Bytes32 } from '../interfaces/base.js';
import { Block, DataRequest, GetBlock } from './rpc-data.js';
import { Input, Output, TransactionCommon } from '@bitauth/libauth';
import { HotDatabaseState, HotUpdate } from '@subsquid/util-internal-processor-tools';
export interface RpcValidationFlags {
}
type TransactionBCH = TransactionCommon<Input<string, string>, Output<string, string, bigint>>;
export type TransactionBCHWithAddress = TransactionBCH & {
    outputs: (TransactionBCH['outputs'][0] & {
        address: string;
    })[];
};
export declare class Rpc {
    readonly client: RpcClient;
    private log?;
    private validation;
    private priority;
    private props;
    private p2pEndpoint;
    private p2p;
    private mempoolWatchCancel?;
    private newBlocksWatchCancel?;
    constructor(client: RpcClient, log?: Logger | undefined, validation?: RpcValidationFlags, priority?: number, props?: RpcProps);
    private setupP2P;
    cleanupRpc(): Promise<void>;
    private p2pReady;
    withPriority(priority: number): Rpc;
    call<T = any>(method: string, params?: any[], options?: CallOptions<T>): Promise<T>;
    batchCall<T = any>(batch: {
        method: string;
        params?: any[];
    }[], options?: CallOptions<T>): Promise<T[]>;
    watchMempool(requests: RangeRequestList<DataRequest>, state: HotDatabaseState, cb: (upd: HotUpdate<Block>) => Promise<void>): Promise<() => Promise<void>>;
    watchNewBlocks(cb: (head: BlockHeader) => Promise<void>): Promise<() => Promise<void>>;
    getBlockByNumber(height: number, withTransactions: boolean): Promise<GetBlock | null>;
    getBlockByHash(hash: Bytes, withTransactions: boolean): Promise<GetBlock | null>;
    getRawTransaction(hash: Bytes): Promise<string>;
    getTransaction(hash: Bytes): Promise<TransactionBCHWithAddress>;
    getBlockHash(height: number): Promise<Bytes | undefined>;
    getHeight(): Promise<number>;
    getColdBlock(blockHash: Bytes32, req?: DataRequest, finalizedHeight?: number): Promise<Block>;
    getColdSplit(req: SplitRequest<DataRequest>): Promise<Block[]>;
    private addColdRequestedData;
    private getColdBlockBatch;
    getHotSplit(req: SplitRequest<DataRequest> & {
        finalizedHeight: number;
    }): Promise<Block[]>;
    private getBlockBatch;
    private addRequestedData;
    private addSourceOutputs;
    private addFees;
    private getBlockByHeightInternal;
    private getBlockByHeightInternalBatch;
    private getBlockHeightByHashInternal;
    private mapToRpcBlock;
    private getBlockByHashInternalBatch;
    private getBlockByHashInternal;
}
interface RpcProps {
    p2pEndpoint?: string;
}
export {};
//# sourceMappingURL=rpc.d.ts.map