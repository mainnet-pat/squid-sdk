import { maybeLast } from '@subsquid/util-internal';
export function setUpRelations(block) {
    block.transactions.sort((a, b) => a.transactionIndex - b.transactionIndex);
    let txs = new Array((maybeLast(block.transactions)?.transactionIndex ?? -1) + 1);
    for (let tx of block.transactions) {
        txs[tx.transactionIndex] = tx;
    }
}
//# sourceMappingURL=relations.js.map