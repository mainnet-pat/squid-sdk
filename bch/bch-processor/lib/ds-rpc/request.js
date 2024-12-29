"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toMappingRequest = toMappingRequest;
function toMappingRequest(req) {
    let txs = transactionsRequested(req);
    return {
        fields: req?.fields || {},
        transactionList: txs,
        transactions: !!req?.transactions?.length || txs && isRequested(TX_FIELDS, req?.fields?.transaction),
        dataRequest: req || {}
    };
}
function transactionsRequested(req) {
    if (req == null)
        return false;
    if (req.transactions?.length)
        return true;
    return false;
}
const TX_FIELDS = {
    inputs: true,
    locktime: true,
    outputs: true,
    size: true,
    sourceOutputs: true,
    transactionIndex: true,
    version: true,
    fee: true,
};
function isRequested(set, selection) {
    if (selection == null)
        return false;
    for (let key in selection) {
        if (set[key] && selection[key])
            return true;
    }
    return false;
}
//# sourceMappingURL=request.js.map