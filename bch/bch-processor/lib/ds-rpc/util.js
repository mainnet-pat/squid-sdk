"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Graph = void 0;
exports.qty2Int = qty2Int;
exports.toQty = toQty;
exports.getTxHash = getTxHash;
const assert_1 = __importDefault(require("assert"));
function qty2Int(qty) {
    let i = parseInt(qty, 16);
    (0, assert_1.default)(Number.isSafeInteger(i));
    return i;
}
function toQty(i) {
    return '0x' + i.toString(16);
}
function getTxHash(tx) {
    if (typeof tx == 'string') {
        return tx;
    }
    else {
        return tx.hash;
    }
}
class Graph {
    constructor() {
        this.graph = new Map();
    }
    addEdge(u, v) {
        if (!this.graph.has(u)) {
            this.graph.set(u, []);
        }
        this.graph.get(u).push(v);
    }
    topologicalSortUtil(v, visited, stack) {
        visited.add(v);
        const neighbors = this.graph.get(v) || [];
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                this.topologicalSortUtil(neighbor, visited, stack);
            }
        }
        stack.push(v);
    }
    topologicalSort() {
        const visited = new Set();
        const stack = [];
        for (const vertex of this.graph.keys()) {
            if (!visited.has(vertex)) {
                this.topologicalSortUtil(vertex, visited, stack);
            }
        }
        return stack.reverse();
    }
}
exports.Graph = Graph;
//# sourceMappingURL=util.js.map