import assert from 'assert';
export function qty2Int(qty) {
    let i = parseInt(qty, 16);
    assert(Number.isSafeInteger(i));
    return i;
}
export function toQty(i) {
    return '0x' + i.toString(16);
}
export function getTxHash(tx) {
    if (typeof tx == 'string') {
        return tx;
    }
    else {
        return tx.hash;
    }
}
export class Graph {
    graph;
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
//# sourceMappingURL=util.js.map