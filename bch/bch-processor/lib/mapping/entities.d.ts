import { Bytes20, Bytes32, Bytes8 } from '../interfaces/base.js';
import { OutputWithAddress } from '../interfaces/bch.js';
import { TransactionBCH } from '@bitauth/libauth';
export declare class Block {
    header: BlockHeader;
    transactions: Transaction[];
    constructor(header: BlockHeader);
}
export declare class BlockHeader {
    id: string;
    height: number;
    hash: Bytes32;
    parentHash: Bytes32;
    nonce?: Bytes8;
    difficulty?: bigint;
    size?: bigint;
    timestamp?: number;
    constructor(height: number, hash: Bytes20, parentHash: Bytes20);
}
export declare class Transaction {
    #private;
    id: string;
    transactionIndex: number;
    hash?: string;
    size?: number;
    sourceOutputs?: OutputWithAddress[];
    inputs?: TransactionBCH["inputs"];
    locktime?: number;
    outputs?: OutputWithAddress[];
    version?: number;
    constructor(block: BlockHeader, transactionIndex: number);
    get block(): BlockHeader;
}
//# sourceMappingURL=entities.d.ts.map