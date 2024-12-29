export declare function getBlockHeaderSelectionValidator(): import("@subsquid/util-internal-validation").Validator<{
    nonce?: boolean | undefined;
    difficulty?: boolean | undefined;
    size?: boolean | undefined;
    timestamp?: boolean | undefined;
}, {
    nonce?: boolean | null | undefined;
    difficulty?: boolean | null | undefined;
    size?: boolean | null | undefined;
    timestamp?: boolean | null | undefined;
}>;
export declare function getTxSelectionValidator(): import("@subsquid/util-internal-validation").Validator<{
    outputs?: boolean | undefined;
    hash?: boolean | undefined;
    size?: boolean | undefined;
    sourceOutputs?: boolean | undefined;
    fee?: boolean | undefined;
    inputs?: boolean | undefined;
    locktime?: boolean | undefined;
    version?: boolean | undefined;
}, {
    outputs?: boolean | null | undefined;
    hash?: boolean | null | undefined;
    size?: boolean | null | undefined;
    sourceOutputs?: boolean | null | undefined;
    fee?: boolean | null | undefined;
    inputs?: boolean | null | undefined;
    locktime?: boolean | null | undefined;
    version?: boolean | null | undefined;
}>;
export declare function getFieldSelectionValidator(): import("@subsquid/util-internal-validation").Validator<{
    block?: {
        nonce?: boolean | undefined;
        difficulty?: boolean | undefined;
        size?: boolean | undefined;
        timestamp?: boolean | undefined;
    } | undefined;
    transaction?: {
        outputs?: boolean | undefined;
        hash?: boolean | undefined;
        size?: boolean | undefined;
        sourceOutputs?: boolean | undefined;
        fee?: boolean | undefined;
        inputs?: boolean | undefined;
        locktime?: boolean | undefined;
        version?: boolean | undefined;
    } | undefined;
}, {
    block?: {
        nonce?: boolean | null | undefined;
        difficulty?: boolean | null | undefined;
        size?: boolean | null | undefined;
        timestamp?: boolean | null | undefined;
    } | null | undefined;
    transaction?: {
        outputs?: boolean | null | undefined;
        hash?: boolean | null | undefined;
        size?: boolean | null | undefined;
        sourceOutputs?: boolean | null | undefined;
        fee?: boolean | null | undefined;
        inputs?: boolean | null | undefined;
        locktime?: boolean | null | undefined;
        version?: boolean | null | undefined;
    } | null | undefined;
}>;
//# sourceMappingURL=selection.d.ts.map