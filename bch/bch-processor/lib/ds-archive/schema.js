"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlockValidator = void 0;
const util_internal_1 = require("@subsquid/util-internal");
const util_internal_validation_1 = require("@subsquid/util-internal-validation");
const schema_js_1 = require("../mapping/schema.js");
exports.getBlockValidator = (0, util_internal_1.weakMemo)((fields) => {
    let BlockHeader = (0, util_internal_validation_1.object)((0, schema_js_1.getBlockHeaderProps)(fields.block, true));
    let Transaction = (0, util_internal_validation_1.object)({
        hash: fields.transaction?.hash ? util_internal_validation_1.BYTES : undefined,
        ...(0, schema_js_1.getTxProps)(fields.transaction, true),
    });
    return (0, util_internal_validation_1.object)({
        header: BlockHeader,
        transactions: (0, util_internal_validation_1.option)((0, util_internal_validation_1.array)(Transaction)),
    });
});
//# sourceMappingURL=schema.js.map