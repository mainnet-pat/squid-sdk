"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUpRelations = setUpRelations;
const util_internal_1 = require("@subsquid/util-internal");
function setUpRelations(block) {
    block.transactions.sort((a, b) => a.transactionIndex - b.transactionIndex);
    let txs = new Array(((0, util_internal_1.maybeLast)(block.transactions)?.transactionIndex ?? -1) + 1);
    for (let tx of block.transactions) {
        txs[tx.transactionIndex] = tx;
    }
}
//# sourceMappingURL=relations.js.map