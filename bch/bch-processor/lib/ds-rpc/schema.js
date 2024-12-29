"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlockValidator = void 0;
const util_internal_1 = require("@subsquid/util-internal");
const util_internal_validation_1 = require("@subsquid/util-internal-validation");
const schema_js_1 = require("../mapping/schema.js");
const rpc_data_js_1 = require("./rpc-data.js");
// Here we must be careful to include all fields,
// that can potentially be used in item filters
// (no matter what field selection is telling us to omit)
exports.getBlockValidator = (0, util_internal_1.weakMemo)((req) => {
    let Transaction = req.transactions
        ? (0, util_internal_validation_1.object)({
            ...(0, schema_js_1.getTxProps)(req.fields.transaction, false),
            hash: rpc_data_js_1.HEX,
        })
        : rpc_data_js_1.HEX;
    let GetBlock = (0, util_internal_validation_1.object)({
        ...(0, schema_js_1.getBlockHeaderProps)(req.fields.block, false),
        transactions: (0, util_internal_validation_1.array)(Transaction)
    });
    return (0, util_internal_validation_1.object)({
        height: util_internal_validation_1.NAT,
        hash: rpc_data_js_1.HEX,
        block: GetBlock,
    });
});
//# sourceMappingURL=schema.js.map