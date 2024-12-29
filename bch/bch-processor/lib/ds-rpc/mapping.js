"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapBlock = mapBlock;
const util_internal_1 = require("@subsquid/util-internal");
const util_internal_validation_1 = require("@subsquid/util-internal-validation");
const entities_js_1 = require("../mapping/entities.js");
const relations_js_1 = require("../mapping/relations.js");
const filter_js_1 = require("./filter.js");
const schema_js_1 = require("./schema.js");
function mapBlock(rpcBlock, req) {
    try {
        return tryMapBlock(rpcBlock, req);
    }
    catch (err) {
        throw (0, util_internal_1.addErrorContext)(err, {
            blockHash: rpcBlock.hash,
            blockHeight: rpcBlock.height
        });
    }
}
function tryMapBlock(rpcBlock, req) {
    let src = (0, util_internal_validation_1.cast)((0, schema_js_1.getBlockValidator)(req), rpcBlock);
    let { height, hash, parentHash, transactions, ...headerProps } = src.block;
    if (headerProps.timestamp) {
        headerProps.timestamp = headerProps.timestamp * 1000; // convert to ms
    }
    let header = new entities_js_1.BlockHeader(height, hash, parentHash);
    Object.assign(header, headerProps);
    let block = new entities_js_1.Block(header);
    if (req.transactionList) {
        for (let i = 0; i < transactions.length; i++) {
            let stx = transactions[i];
            let tx = new entities_js_1.Transaction(header, i);
            if (typeof stx == 'string') {
                if (req.fields.transaction?.hash) {
                    tx.hash = stx;
                }
            }
            else {
                let { ...props } = stx;
                Object.assign(tx, props);
            }
            block.transactions.push(tx);
        }
    }
    (0, relations_js_1.setUpRelations)(block);
    (0, filter_js_1.filterBlock)(block, req.dataRequest);
    return block;
}
//# sourceMappingURL=mapping.js.map