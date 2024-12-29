import { FieldSelection } from '../interfaces/data.js';
export declare function getBlockHeaderProps(fields: FieldSelection['block'], forArchive: boolean): {
    nonce?: import("@subsquid/util-internal-validation").Validator<number, number | null | undefined> | undefined;
    difficulty?: import("@subsquid/util-internal-validation").Validator<number, number | null | undefined> | undefined;
    size?: import("@subsquid/util-internal-validation").Validator<number, number | null | undefined> | undefined;
    timestamp?: import("@subsquid/util-internal-validation").Validator<number, number | null | undefined> | undefined;
    height: import("@subsquid/util-internal-validation").Validator<number, number>;
    hash: import("@subsquid/util-internal-validation").Validator<string, string>;
    parentHash: import("@subsquid/util-internal-validation").Validator<string, string>;
};
export declare function getTxProps(fields: FieldSelection['transaction'], forArchive: boolean): {
    hash?: import("@subsquid/util-internal-validation").Validator<string, string> | undefined;
    size?: import("@subsquid/util-internal-validation").Validator<number, number> | undefined;
    sourceOutputs?: import("@subsquid/util-internal-validation").Validator<{
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
    }[] | undefined, {
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
    }[] | null | undefined> | undefined;
    inputs?: import("@subsquid/util-internal-validation").Validator<{
        outpointIndex: number;
        outpointTransactionHash: string;
        sequenceNumber: number;
        unlockingBytecode: string;
    }[], {
        outpointIndex: number;
        outpointTransactionHash: string;
        sequenceNumber: number;
        unlockingBytecode: string;
    }[]> | undefined;
    outputs?: import("@subsquid/util-internal-validation").Validator<{
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
    }[], {
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
    }[]> | undefined;
    locktime?: import("@subsquid/util-internal-validation").Validator<number, number> | undefined;
    version?: import("@subsquid/util-internal-validation").Validator<number, number> | undefined;
    transactionIndex: import("@subsquid/util-internal-validation").Validator<number, number>;
};
export declare function project<T extends object, F extends {
    [K in keyof T]?: boolean;
}>(fields: F | undefined, obj: T): Partial<T>;
export declare function isEmpty(obj: object): boolean;
export declare function assertAssignable<A, B extends A>(): void;
//# sourceMappingURL=schema.d.ts.map