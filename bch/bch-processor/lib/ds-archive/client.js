"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BchArchive = void 0;
const util_internal_1 = require("@subsquid/util-internal");
const util_internal_ingest_tools_1 = require("@subsquid/util-internal-ingest-tools");
const util_internal_range_1 = require("@subsquid/util-internal-range");
const util_internal_validation_1 = require("@subsquid/util-internal-validation");
const assert_1 = __importDefault(require("assert"));
const entities_js_1 = require("../mapping/entities.js");
const relations_js_1 = require("../mapping/relations.js");
const schema_js_1 = require("./schema.js");
const NO_FIELDS = {};
class BchArchive {
    constructor(client) {
        this.client = client;
    }
    getFinalizedHeight() {
        return this.client.getHeight();
    }
    async getBlockHash(height) {
        let blocks = await this.client.query({
            fromBlock: height,
            toBlock: height,
            includeAllBlocks: true
        });
        (0, assert_1.default)(blocks.length == 1);
        return blocks[0].header.hash;
    }
    async *getFinalizedBlocks(requests, stopOnHead) {
        for await (let batch of (0, util_internal_ingest_tools_1.archiveIngest)({
            requests,
            client: this.client,
            stopOnHead
        })) {
            let fields = (0, util_internal_range_1.getRequestAt)(requests, batch.blocks[0].header.number)?.fields || NO_FIELDS;
            let blocks = batch.blocks.map(b => {
                try {
                    return this.mapBlock(b, fields);
                }
                catch (err) {
                    throw (0, util_internal_1.addErrorContext)(err, {
                        blockHeight: b.header.number,
                        blockHash: b.header.hash
                    });
                }
            });
            yield { blocks, isHead: batch.isHead, mempoolTransactions: [] };
        }
    }
    mapBlock(rawBlock, fields) {
        let validator = (0, schema_js_1.getBlockValidator)(fields);
        let src = (0, util_internal_validation_1.cast)(validator, rawBlock);
        let { height, hash, parentHash, ...hdr } = src.header;
        if (hdr.timestamp) {
            hdr.timestamp = hdr.timestamp * 1000; // convert to ms
        }
        let header = new entities_js_1.BlockHeader(height, hash, parentHash);
        Object.assign(header, hdr);
        let block = new entities_js_1.Block(header);
        if (src.transactions) {
            for (let { ...props } of src.transactions) {
                let tx = new entities_js_1.Transaction(header, 0);
                Object.assign(tx, props);
                block.transactions.push(tx);
            }
        }
        (0, relations_js_1.setUpRelations)(block);
        return block;
    }
}
exports.BchArchive = BchArchive;
//# sourceMappingURL=client.js.map