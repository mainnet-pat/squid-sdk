import { DbType } from '../db';
import { OrderBy, SortOrder, SqlArguments } from '../ir/args';
import { FieldRequest, FieldsByEntity } from '../ir/fields';
import { Model } from '../model';
import { Cursor } from './cursor';
import { AliasSet } from './util';
export declare class EntitySqlPrinter {
    private model;
    private dialect;
    readonly entityName: string;
    private params;
    private args;
    private aliases;
    private join;
    private root;
    private columns;
    private where;
    private orderBy;
    constructor(model: Model, dialect: DbType, entityName: string, params: unknown[], args?: SqlArguments, fields?: FieldRequest[], aliases?: AliasSet);
    private sub;
    private populateColumns;
    private populateWhere;
    private scalarBinaryCondition;
    private refBinaryCondition;
    private printWhere;
    traverseOrderBy(orderBy: OrderBy, cb: (field: string, cursor: Cursor, order: SortOrder) => void): void;
    private visitOrderBy;
    private param;
    private ident;
    private addWhereDerivedFrom;
    hasColumns(): boolean;
    printColumnList(options?: {
        withAliases?: boolean;
    }): string;
    printColumnListAsJsonArray(): string;
    printFrom(): string;
    print(): string;
    printAsCount(): string;
    private printAsJsonRows;
}
export declare class QueryableSqlPrinter {
    private model;
    private dialect;
    private queryableName;
    private params;
    private args;
    private printers;
    private orders;
    private orderColumns;
    constructor(model: Model, dialect: DbType, queryableName: string, params: unknown[], args?: SqlArguments, fields?: FieldsByEntity);
    print(): string;
    printAsCount(): string;
    private printArgs;
}
//# sourceMappingURL=printer.d.ts.map