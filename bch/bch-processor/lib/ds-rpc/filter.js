"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterBlock = filterBlock;
const util_internal_1 = require("@subsquid/util-internal");
const util_internal_processor_tools_1 = require("@subsquid/util-internal-processor-tools");
function buildTransactionFilter(dataRequest) {
    let items = new util_internal_processor_tools_1.EntityFilter();
    for (let req of dataRequest.transactions || []) {
        let { 
        // address, tokenId
        ...relations } = req;
        let filter = new util_internal_processor_tools_1.FilterBuilder();
        // filter.propIn('address', address)
        // filter.propIn('tokenId', tokenId)
        items.add(filter, relations);
    }
    return items;
}
const getItemFilter = (0, util_internal_1.weakMemo)((dataRequest) => {
    return {
        transactions: buildTransactionFilter(dataRequest),
    };
});
class IncludeSet {
    constructor() {
        this.transactions = new Set();
    }
    addTransaction(tx) {
        if (tx)
            this.transactions.add(tx);
    }
}
function filterBlock(block, dataRequest) {
    let items = getItemFilter(dataRequest);
    let include = new IncludeSet();
    if (items.transactions.present()) {
        for (let tx of block.transactions) {
            let rel = items.transactions.match(tx);
            if (rel == null)
                continue;
            include.addTransaction(tx);
        }
    }
    block.transactions = block.transactions.filter(tx => {
        if (!include.transactions.has(tx))
            return false;
        return true;
    });
}
//# sourceMappingURL=filter.js.map