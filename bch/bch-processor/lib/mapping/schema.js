"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlockHeaderProps = getBlockHeaderProps;
exports.getTxProps = getTxProps;
exports.project = project;
exports.isEmpty = isEmpty;
exports.assertAssignable = assertAssignable;
const rpc_data_js_1 = require("../ds-rpc/rpc-data.js");
const util_internal_validation_1 = require("@subsquid/util-internal-validation");
function getBlockHeaderProps(fields, forArchive) {
    let natural = forArchive ? util_internal_validation_1.NAT : util_internal_validation_1.SMALL_QTY;
    return {
        height: util_internal_validation_1.NAT,
        hash: rpc_data_js_1.HEX,
        parentHash: rpc_data_js_1.HEX,
        ...project(fields, {
            nonce: (0, util_internal_validation_1.withSentinel)('BlockHeader.nonce', 0, util_internal_validation_1.NAT),
            difficulty: (0, util_internal_validation_1.withSentinel)('BlockHeader.difficulty', 0, util_internal_validation_1.NAT),
            size: (0, util_internal_validation_1.withSentinel)('BlockHeader.size', 0, util_internal_validation_1.NAT),
            timestamp: (0, util_internal_validation_1.withSentinel)('BlockHeader.timestamp', 0, util_internal_validation_1.NAT),
        })
    };
}
function getTxProps(fields, forArchive) {
    // let natural = forArchive ? NAT : SMALL_QTY
    return {
        transactionIndex: util_internal_validation_1.NAT,
        ...project(fields, {
            hash: rpc_data_js_1.HEX,
            size: util_internal_validation_1.NAT,
            sourceOutputs: (0, util_internal_validation_1.option)((0, util_internal_validation_1.array)((0, util_internal_validation_1.object)({
                lockingBytecode: rpc_data_js_1.HEX,
                token: (0, util_internal_validation_1.option)((0, util_internal_validation_1.object)({
                    amount: rpc_data_js_1.BIGINT,
                    category: rpc_data_js_1.HEX,
                    nft: (0, util_internal_validation_1.option)((0, util_internal_validation_1.object)({
                        capability: util_internal_validation_1.STRING,
                        commitment: rpc_data_js_1.HEX,
                    })),
                })),
                valueSatoshis: rpc_data_js_1.BIGINT,
                address: util_internal_validation_1.STRING,
            }))),
            inputs: (0, util_internal_validation_1.array)((0, util_internal_validation_1.object)({
                outpointIndex: util_internal_validation_1.NAT,
                outpointTransactionHash: rpc_data_js_1.HEX,
                sequenceNumber: util_internal_validation_1.NAT,
                unlockingBytecode: rpc_data_js_1.HEX,
            })),
            outputs: (0, util_internal_validation_1.array)((0, util_internal_validation_1.object)({
                lockingBytecode: rpc_data_js_1.HEX,
                token: (0, util_internal_validation_1.option)((0, util_internal_validation_1.object)({
                    amount: rpc_data_js_1.BIGINT,
                    category: rpc_data_js_1.HEX,
                    nft: (0, util_internal_validation_1.option)((0, util_internal_validation_1.object)({
                        capability: util_internal_validation_1.STRING,
                        commitment: rpc_data_js_1.HEX,
                    })),
                })),
                valueSatoshis: rpc_data_js_1.BIGINT,
                address: util_internal_validation_1.STRING,
            })),
            locktime: util_internal_validation_1.NAT,
            version: util_internal_validation_1.NAT,
        })
    };
}
function project(fields, obj) {
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
function isEmpty(obj) {
    for (let _ in obj) {
        return false;
    }
    return true;
}
function assertAssignable() { }
//# sourceMappingURL=schema.js.map