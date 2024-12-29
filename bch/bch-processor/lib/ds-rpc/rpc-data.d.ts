import { GetSrcType, ValidationFailure, Validator } from '@subsquid/util-internal-validation';
import { Bytes, Bytes32 } from '../interfaces/base.js';
export declare class ValidationFailureEx extends ValidationFailure {
    toString(): string;
}
/**
 * Hex encoded binary string or natural number without 0x prefix
 */
type Hex = string;
/**
 * Hex encoded binary string without 0x prefix
 */
export declare const HEX: Validator<Hex>;
/**
 * Hex encoded binary string without 0x prefix
 */
export declare const BIGINT: Validator<bigint>;
export interface RpcBlock {
    hash: string;
    confirmations: number;
    size: number;
    height: number;
    version: number;
    tx: string[];
    time: number;
    nonce: number;
    difficulty: number;
    nTx: number;
    previousblockhash: string;
}
export interface DataRequest {
    transactions?: boolean;
    sourceOutputs?: boolean;
    fee?: boolean;
}
export interface Block {
    height: number;
    hash: Bytes32;
    block: GetBlock;
    _isInvalid?: boolean;
    _errorMessage?: string;
}
declare const Transaction: Validator<{
    blockNumber: number;
    blockHash: string;
    transactionIndex: number;
    size: number;
    hash: string;
    inputs: {
        outpointIndex: number;
        outpointTransactionHash: string;
        sequenceNumber: number;
        unlockingBytecode: string;
    }[];
    outputs: {
        lockingBytecode: string;
        valueSatoshis: bigint;
        address: string;
        token?: {
            amount: bigint;
            category: string;
            nft?: {
                capability: string;
                commitment: string;
            } | undefined;
        } | undefined;
    }[];
    locktime: number;
    version: number;
    sourceOutputs?: {
        lockingBytecode: string;
        valueSatoshis: bigint;
        address: string;
        token?: {
            amount: bigint;
            category: string;
            nft?: {
                capability: string;
                commitment: string;
            } | undefined;
        } | undefined;
    }[] | undefined;
    fee?: number | undefined;
}, {
    blockNumber: number;
    blockHash: string;
    transactionIndex: number;
    size: number;
    hash: string;
    inputs: {
        outpointIndex: number;
        outpointTransactionHash: string;
        sequenceNumber: number;
        unlockingBytecode: string;
    }[];
    outputs: {
        lockingBytecode: string;
        valueSatoshis: bigint;
        address: string;
        token?: {
            amount: bigint;
            category: string;
            nft?: {
                capability: string;
                commitment: string;
            } | null | undefined;
        } | null | undefined;
    }[];
    locktime: number;
    version: number;
    sourceOutputs?: {
        lockingBytecode: string;
        valueSatoshis: bigint;
        address: string;
        token?: {
            amount: bigint;
            category: string;
            nft?: {
                capability: string;
                commitment: string;
            } | null | undefined;
        } | null | undefined;
    }[] | null | undefined;
    fee?: number | null | undefined;
}>;
export type Transaction = GetSrcType<typeof Transaction>;
export declare const GetBlockWithTransactions: Validator<{
    height: number;
    hash: string;
    parentHash: string;
    transactions: {
        blockNumber: number;
        blockHash: string;
        transactionIndex: number;
        size: number;
        hash: string;
        inputs: {
            outpointIndex: number;
            outpointTransactionHash: string;
            sequenceNumber: number;
            unlockingBytecode: string;
        }[];
        outputs: {
            lockingBytecode: string;
            valueSatoshis: bigint;
            address: string;
            token?: {
                amount: bigint;
                category: string;
                nft?: {
                    capability: string;
                    commitment: string;
                } | undefined;
            } | undefined;
        }[];
        locktime: number;
        version: number;
        sourceOutputs?: {
            lockingBytecode: string;
            valueSatoshis: bigint;
            address: string;
            token?: {
                amount: bigint;
                category: string;
                nft?: {
                    capability: string;
                    commitment: string;
                } | undefined;
            } | undefined;
        }[] | undefined;
        fee?: number | undefined;
    }[];
    difficulty: number;
    size: number;
    timestamp: number;
    nonce: number;
}, {
    height: number;
    hash: string;
    parentHash: string;
    transactions: {
        blockNumber: number;
        blockHash: string;
        transactionIndex: number;
        size: number;
        hash: string;
        inputs: {
            outpointIndex: number;
            outpointTransactionHash: string;
            sequenceNumber: number;
            unlockingBytecode: string;
        }[];
        outputs: {
            lockingBytecode: string;
            valueSatoshis: bigint;
            address: string;
            token?: {
                amount: bigint;
                category: string;
                nft?: {
                    capability: string;
                    commitment: string;
                } | null | undefined;
            } | null | undefined;
        }[];
        locktime: number;
        version: number;
        sourceOutputs?: {
            lockingBytecode: string;
            valueSatoshis: bigint;
            address: string;
            token?: {
                amount: bigint;
                category: string;
                nft?: {
                    capability: string;
                    commitment: string;
                } | null | undefined;
            } | null | undefined;
        }[] | null | undefined;
        fee?: number | null | undefined;
    }[];
    difficulty: number;
    size: number;
    timestamp: number;
    nonce: number;
}>;
export declare const GetBlockNoTransactions: Validator<{
    height: number;
    hash: string;
    parentHash: string;
    transactions: string[];
    difficulty: number;
    size: number;
    timestamp: number;
    nonce: number;
}, {
    height: number;
    hash: string;
    parentHash: string;
    transactions: string[];
    difficulty: number;
    size: number;
    timestamp: number;
    nonce: number;
}>;
export interface GetBlock {
    height: number;
    hash: Bytes32;
    parentHash: Bytes32;
    transactions: Bytes[] | Transaction[];
    difficulty: number;
    size: number;
    timestamp: number;
    nonce: number;
}
export {};
//# sourceMappingURL=rpc-data.d.ts.map