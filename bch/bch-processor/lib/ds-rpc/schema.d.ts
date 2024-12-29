import { MappingRequest } from './request.js';
export declare const getBlockValidator: (obj: MappingRequest) => import("@subsquid/util-internal-validation").Validator<{
    height: number;
    hash: string;
    block: {
        transactions: (string | {
            hash: string;
            transactionIndex: number;
            size?: number | undefined;
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
            inputs?: {
                outpointIndex: number;
                outpointTransactionHash: string;
                sequenceNumber: number;
                unlockingBytecode: string;
            }[] | undefined;
            outputs?: {
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
            locktime?: number | undefined;
            version?: number | undefined;
        })[];
        height: number;
        hash: string;
        parentHash: string;
        nonce?: number | undefined;
        difficulty?: number | undefined;
        size?: number | undefined;
        timestamp?: number | undefined;
    };
}, {
    height: number;
    hash: string;
    block: {
        transactions: (string | {
            hash: string;
            transactionIndex: number;
            size?: number | undefined;
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
            inputs?: {
                outpointIndex: number;
                outpointTransactionHash: string;
                sequenceNumber: number;
                unlockingBytecode: string;
            }[] | undefined;
            outputs?: {
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
            }[] | undefined;
            locktime?: number | undefined;
            version?: number | undefined;
        })[];
        height: number;
        hash: string;
        parentHash: string;
        nonce?: number | null | undefined;
        difficulty?: number | null | undefined;
        size?: number | null | undefined;
        timestamp?: number | null | undefined;
    };
}>;
//# sourceMappingURL=schema.d.ts.map