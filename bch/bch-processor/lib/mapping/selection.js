"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlockHeaderSelectionValidator = getBlockHeaderSelectionValidator;
exports.getTxSelectionValidator = getTxSelectionValidator;
exports.getFieldSelectionValidator = getFieldSelectionValidator;
const util_internal_validation_1 = require("@subsquid/util-internal-validation");
const FIELD = (0, util_internal_validation_1.option)(util_internal_validation_1.BOOLEAN);
function getBlockHeaderSelectionValidator() {
    let fields = {
        nonce: FIELD,
        difficulty: FIELD,
        size: FIELD,
        timestamp: FIELD,
    };
    return (0, util_internal_validation_1.object)(fields);
}
function getTxSelectionValidator() {
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
    return (0, util_internal_validation_1.object)(fields);
}
function getFieldSelectionValidator() {
    return (0, util_internal_validation_1.object)({
        block: (0, util_internal_validation_1.option)(getBlockHeaderSelectionValidator()),
        transaction: (0, util_internal_validation_1.option)(getTxSelectionValidator()),
    });
}
//# sourceMappingURL=selection.js.map