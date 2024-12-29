import { BIGINT, HEX } from '../ds-rpc/rpc-data.js';
import { array, NAT, object, option, SMALL_QTY, STRING, withSentinel } from '@subsquid/util-internal-validation';
export function getBlockHeaderProps(fields, forArchive) {
    let natural = forArchive ? NAT : SMALL_QTY;
    return {
        height: NAT,
        hash: HEX,
        parentHash: HEX,
        ...project(fields, {
            nonce: withSentinel('BlockHeader.nonce', 0, NAT),
            difficulty: withSentinel('BlockHeader.difficulty', 0, NAT),
            size: withSentinel('BlockHeader.size', 0, NAT),
            timestamp: withSentinel('BlockHeader.timestamp', 0, NAT),
        })
    };
}
export function getTxProps(fields, forArchive) {
    // let natural = forArchive ? NAT : SMALL_QTY
    return {
        transactionIndex: NAT,
        ...project(fields, {
            hash: HEX,
            size: NAT,
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
        })
    };
}
export function project(fields, obj) {
    if (fields == null)
        return {};
    let result = {};
    let key;
    for (key in obj) {
        if (fields[key]) {
            result[key] = obj[key];
        }
    }
    return result;
}
export function isEmpty(obj) {
    for (let _ in obj) {
        return false;
    }
    return true;
}
export function assertAssignable() { }
//# sourceMappingURL=schema.js.map