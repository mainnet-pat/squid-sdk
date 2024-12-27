import type { DbType } from "../db";
export declare function escapeIdentifier(dialect: DbType, name: string): string;
export declare class ColumnSet {
    private columns;
    add(column: string): number;
    names(): string[];
    size(): number;
}
/**
 * LEFT OUTER JOIN "{table}" "{alias}" ON "{alias}"."{column}" = {rhs}
 */
export interface Join {
    table: string;
    alias: string;
    column: string;
    rhs: string;
}
export declare class JoinSet {
    private aliases;
    private joins;
    constructor(aliases: AliasSet);
    add(table: string, column: string, rhs: string): string;
    forEach(cb: (join: Join) => void): void;
}
export declare class AliasSet {
    private aliases;
    add(name: string): string;
}
export declare function printClause(op: string, exps: string[]): string;
//# sourceMappingURL=util.d.ts.map