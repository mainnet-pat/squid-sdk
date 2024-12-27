import { DbType } from "../db";
import { Entity, Model, ObjectPropType, Prop, UnionPropType } from "../model";
import { AliasSet, JoinSet } from "./util";
export interface CursorCtx {
    model: Model;
    dialect: DbType;
    aliases: AliasSet;
    join: JoinSet;
}
export interface Cursor {
    output(field: string): string;
    native(field: string): string;
    ref(field: string): string;
    child(field: string): Cursor;
    prop(field: string): Prop;
}
export declare class EntityCursor implements Cursor {
    private ctx;
    private entityName;
    readonly entity: Entity;
    readonly table: string;
    readonly tableAlias: string;
    constructor(ctx: CursorCtx, entityName: string, joined?: {
        on: string;
        rhs: string;
    });
    private ident;
    private column;
    private _columnName;
    prop(field: string): Prop;
    output(field: string): string;
    native(field: string): string;
    ref(field: string): string;
    child(field: string): Cursor;
    tsv(queryName: string): string;
    doc(queryName: string): string;
}
export declare class ObjectCursor implements Cursor {
    private ctx;
    private prefix;
    private object;
    readonly isUnion: boolean;
    constructor(ctx: CursorCtx, prefix: string, type: ObjectPropType | UnionPropType);
    private json;
    private string;
    prop(field: string): Prop;
    output(field: string): string;
    native(field: string): string;
    ref(field: string): string;
    child(field: string): Cursor;
}
//# sourceMappingURL=cursor.d.ts.map