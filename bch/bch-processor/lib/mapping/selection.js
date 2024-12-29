import { object, option, BOOLEAN } from '@subsquid/util-internal-validation';
const FIELD = option(BOOLEAN);
export function getBlockHeaderSelectionValidator() {
    let fields = {
        nonce: FIELD,
        difficulty: FIELD,
        size: FIELD,
        timestamp: FIELD,
    };
    return object(fields);
}
export function getTxSelectionValidator() {
    let fields = {
        hash: FIELD,
        inputs: FIELD,
        locktime: FIELD,
        outputs: FIELD,
        version: FIELD,
        size: FIELD,
        sourceOutputs: FIELD,
        fee: FIELD,
    };
    return object(fields);
}
export function getFieldSelectionValidator() {
    return object({
        block: option(getBlockHeaderSelectionValidator()),
        transaction: option(getTxSelectionValidator()),
    });
}
//# sourceMappingURL=selection.js.map