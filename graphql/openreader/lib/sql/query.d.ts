import type { DbType } from '../db';
import type { SqlArguments, Where } from '../ir/args';
import { RelayConnectionRequest, RelayConnectionResponse } from '../ir/connection';
import type { AnyFields, FieldRequest } from '../ir/fields';
import type { Model } from '../model';
export interface Query<T> {
    readonly sql: string;
    readonly params: unknown[];
    map(rows: any[][]): T;
}
export declare class ListQuery implements Query<any[]> {
    private fields;
    readonly sql: string;
    readonly params: unknown[];
    constructor(model: Model, dialect: DbType, typeName: string, fields: AnyFields, args: SqlArguments);
    map(rows: any[][]): any[];
}
export declare class EntityByIdQuery {
    private fields;
    readonly sql: string;
    readonly params: unknown[];
    constructor(model: Model, dialect: DbType, entityName: string, fields: FieldRequest[], id: string);
    map(rows: any[][]): any;
}
export declare class CountQuery implements Query<number> {
    readonly sql: string;
    readonly params: unknown[];
    constructor(model: Model, dialect: DbType, typeName: string, where?: Where);
    map(rows: any[][]): number;
}
export declare class ConnectionQuery implements Query<RelayConnectionResponse> {
    readonly sql: string;
    readonly params: unknown[];
    private offset;
    private limit;
    private edgeNode?;
    private edgeCursor?;
    private pageInfo?;
    private totalCount?;
    constructor(model: Model, dialect: DbType, typeName: string, req: RelayConnectionRequest<AnyFields>);
    private setOffsetAndLimit;
    map(rows: any[][]): RelayConnectionResponse;
    private getPageInfo;
    private getTotalCount;
}
//# sourceMappingURL=query.d.ts.map