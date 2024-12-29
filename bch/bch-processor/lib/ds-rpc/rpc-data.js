import { array, NAT, object, option, STRING, ValidationFailure } from '@subsquid/util-internal-validation';
export class ValidationFailureEx extends ValidationFailure {
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
function isHex(value) {
    return typeof value == 'string' && /^[0-9a-fA-F]*$/.test(value);
}
/**
 * Hex encoded binary string without 0x prefix
 */
export const HEX = {
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
export const BIGINT = {
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
const Transaction = object({
    blockNumber: NAT,
    blockHash: HEX,
    transactionIndex: NAT,
    size: NAT,
    hash: HEX,
    sourceOutputs: option(array(object({
        lockingBytecode: HEX,
        token: option(object({
            amount: BIGINT,
            category: HEX,
            nft: option(object({
                capability: STRING,
                commitment: HEX,
            })),
        })),
        valueSatoshis: BIGINT,
        address: STRING,
    }))),
    inputs: array(object({
        outpointIndex: NAT,
        outpointTransactionHash: HEX,
        sequenceNumber: NAT,
        unlockingBytecode: HEX,
    })),
    outputs: array(object({
        lockingBytecode: HEX,
        token: option(object({
            amount: BIGINT,
            category: HEX,
            nft: option(object({
                capability: STRING,
                commitment: HEX,
            })),
        })),
        valueSatoshis: BIGINT,
        address: STRING,
    })),
    locktime: NAT,
    version: NAT,
    fee: option(NAT),
});
export const GetBlockWithTransactions = object({
    height: NAT,
    hash: HEX,
    parentHash: HEX,
    transactions: array(Transaction),
    difficulty: NAT,
    size: NAT,
    timestamp: NAT,
    nonce: NAT,
});
export const GetBlockNoTransactions = object({
    height: NAT,
    hash: HEX,
    parentHash: HEX,
    transactions: array(HEX),
    difficulty: NAT,
    size: NAT,
    timestamp: NAT,
    nonce: NAT,
});
//# sourceMappingURL=rpc-data.js.map