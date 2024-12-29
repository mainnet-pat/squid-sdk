import { Bytes32, Qty } from '../interfaces/base.js';
export declare function qty2Int(qty: Qty): number;
export declare function toQty(i: number): Qty;
export declare function getTxHash(tx: Bytes32 | {
    hash: Bytes32;
}): Bytes32;
export declare class Graph {
    graph: Map<string, string[]>;
    constructor();
    addEdge(u: string, v: string): void;
    topologicalSortUtil(v: string, visited: Set<string>, stack: Array<string>): void;
    topologicalSort(): string[];
}
//# sourceMappingURL=util.d.ts.map