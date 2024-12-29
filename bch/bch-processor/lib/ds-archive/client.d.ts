import { ArchiveClient } from '@subsquid/util-internal-archive-client';
import { Batch, DataSource } from '@subsquid/util-internal-processor-tools';
import { RangeRequest } from '@subsquid/util-internal-range';
import { Bytes32 } from '../interfaces/base.js';
import { DataRequest } from '../interfaces/data-request.js';
import { Block } from '../mapping/entities.js';
export declare class BchArchive implements DataSource<Block, DataRequest> {
    private client;
    constructor(client: ArchiveClient);
    getFinalizedHeight(): Promise<number>;
    getBlockHash(height: number): Promise<Bytes32>;
    getFinalizedBlocks(requests: RangeRequest<DataRequest>[], stopOnHead?: boolean | undefined): AsyncIterable<Batch<Block>>;
    private mapBlock;
}
//# sourceMappingURL=client.d.ts.map