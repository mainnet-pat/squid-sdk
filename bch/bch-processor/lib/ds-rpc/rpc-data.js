"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetBlockNoTransactions = exports.GetBlockWithTransactions = exports.BIGINT = exports.HEX = exports.ValidationFailureEx = void 0;
const util_internal_validation_1 = require("@subsquid/util-internal-validation");
class ValidationFailureEx extends util_internal_validation_1.ValidationFailure {
    toString() {
        let msg = this.message;
        if (msg.includes('{value}')) {
            msg = msg.replace('{value}', JSON.stringify(this.value));
        }
        if (this.path.length) {
            msg = `invalid value at ${this.getPathString()}: ${msg}`;
        }
        return msg;
    }
}
exports.ValidationFailureEx = ValidationFailureEx;
function isHex(value) {
    return typeof value == 'string' && /^[0-9a-fA-F]*$/.test(value);
}
/**
 * Hex encoded binary string without 0x prefix
 */
exports.HEX = {
    cast(value) {
        return this.validate(value) || value.toLowerCase();
    },
    validate(value) {
        if (isHex(value))
            return;
        return new ValidationFailureEx(value, `{value} is not a hex encoded binary string`);
    },
    phantom() {
        return '';
    }
};
function isBigint(value) {
    return typeof value == 'bigint';
}
/**
 * Hex encoded binary string without 0x prefix
 */
exports.BIGINT = {
    cast(value) {
        return this.validate(value) || value;
    },
    validate(value) {
        if (isBigint(value))
            return;
        return new ValidationFailureEx(value, `{value} is not a bigint`);
    },
    phantom() {
        return 0n;
    }
};
const Transaction = (0, util_internal_validation_1.object)({
    blockNumber: util_internal_validation_1.NAT,
    blockHash: exports.HEX,
    transactionIndex: util_internal_validation_1.NAT,
    size: util_internal_validation_1.NAT,
    hash: exports.HEX,
    sourceOutputs: (0, util_internal_validation_1.option)((0, util_internal_validation_1.array)((0, util_internal_validation_1.object)({
        lockingBytecode: exports.HEX,
        token: (0, util_internal_validation_1.option)((0, util_internal_validation_1.object)({
            amount: exports.BIGINT,
            category: exports.HEX,
            nft: (0, util_internal_validation_1.option)((0, util_internal_validation_1.object)({
                capability: util_internal_validation_1.STRING,
                commitment: exports.HEX,
            })),
        })),
        valueSatoshis: exports.BIGINT,
        address: util_internal_validation_1.STRING,
    }))),
    inputs: (0, util_internal_validation_1.array)((0, util_internal_validation_1.object)({
        outpointIndex: util_internal_validation_1.NAT,
        outpointTransactionHash: exports.HEX,
        sequenceNumber: util_internal_validation_1.NAT,
        unlockingBytecode: exports.HEX,
    })),
    outputs: (0, util_internal_validation_1.array)((0, util_internal_validation_1.object)({
        lockingBytecode: exports.HEX,
        token: (0, util_internal_validation_1.option)((0, util_internal_validation_1.object)({
            amount: exports.BIGINT,
            category: exports.HEX,
            nft: (0, util_internal_validation_1.option)((0, util_internal_validation_1.object)({
                capability: util_internal_validation_1.STRING,
                commitment: exports.HEX,
            })),
        })),
        valueSatoshis: exports.BIGINT,
        address: util_internal_validation_1.STRING,
    })),
    locktime: util_internal_validation_1.NAT,
    version: util_internal_validation_1.NAT,
    fee: (0, util_internal_validation_1.option)(util_internal_validation_1.NAT),
});
exports.GetBlockWithTransactions = (0, util_internal_validation_1.object)({
    height: util_internal_validation_1.NAT,
    hash: exports.HEX,
    parentHash: exports.HEX,
    transactions: (0, util_internal_validation_1.array)(Transaction),
    difficulty: util_internal_validation_1.NAT,
    size: util_internal_validation_1.NAT,
    timestamp: util_internal_validation_1.NAT,
    nonce: util_internal_validation_1.NAT,
});
exports.GetBlockNoTransactions = (0, util_internal_validation_1.object)({
    height: util_internal_validation_1.NAT,
    hash: exports.HEX,
    parentHash: exports.HEX,
    transactions: (0, util_internal_validation_1.array)(exports.HEX),
    difficulty: util_internal_validation_1.NAT,
    size: util_internal_validation_1.NAT,
    timestamp: util_internal_validation_1.NAT,
    nonce: util_internal_validation_1.NAT,
});
//# sourceMappingURL=rpc-data.js.map