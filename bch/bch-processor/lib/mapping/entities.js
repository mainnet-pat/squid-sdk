"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Transaction_block;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transaction = exports.BlockHeader = exports.Block = void 0;
const util_internal_processor_tools_1 = require("@subsquid/util-internal-processor-tools");
class Block {
    constructor(header) {
        this.transactions = [];
        this.header = header;
    }
}
exports.Block = Block;
class BlockHeader {
    constructor(height, hash, parentHash) {
        this.id = (0, util_internal_processor_tools_1.formatId)({ height, hash });
        this.height = height;
        this.hash = hash;
        this.parentHash = parentHash;
    }
}
exports.BlockHeader = BlockHeader;
class Transaction {
    constructor(block, transactionIndex) {
        _Transaction_block.set(this, void 0);
        this.id = (0, util_internal_processor_tools_1.formatId)(block, transactionIndex);
        this.transactionIndex = transactionIndex;
        __classPrivateFieldSet(this, _Transaction_block, block, "f");
    }
    get block() {
        return __classPrivateFieldGet(this, _Transaction_block, "f");
    }
}
exports.Transaction = Transaction;
_Transaction_block = new WeakMap();
//# sourceMappingURL=entities.js.map