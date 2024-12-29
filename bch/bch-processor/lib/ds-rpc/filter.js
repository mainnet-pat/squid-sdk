import { weakMemo } from '@subsquid/util-internal';
import { EntityFilter, FilterBuilder } from '@subsquid/util-internal-processor-tools';
function buildTransactionFilter(dataRequest) {
    let items = new EntityFilter();
    for (let req of dataRequest.transactions || []) {
        let { 
        // address, tokenId
        ...relations } = req;
        let filter = new FilterBuilder();
        // filter.propIn('address', address)
        // filter.propIn('tokenId', tokenId)
        items.add(filter, relations);
    }
    return items;
}
const getItemFilter = weakMemo((dataRequest) => {
    return {
        transactions: buildTransactionFilter(dataRequest),
    };
});
class IncludeSet {
    transactions = new Set();
    addTransaction(tx) {
        if (tx)
            this.transactions.add(tx);
    }
}
export function filterBlock(block, dataRequest) {
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