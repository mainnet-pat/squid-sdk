import { EnumPropType, FkPropType, ListLookupPropType, ListPropType, LookupPropType, ObjectPropType, Prop, PropType, ScalarPropType, UnionPropType } from "../model";
import { SqlArguments } from "./args";
export type FieldRequest = EntityListRequest | ObjectRequest | OpaqueRequest;
type Base<T> = T extends PropType ? {
    field: string;
    kind: T['kind'];
    type: T;
    prop: Prop;
    aliases: string[];
    ifType?: string;
    index: number;
} : never;
export type EntityListRequest = Base<ListLookupPropType> & {
    children: FieldRequest[];
    args?: SqlArguments;
};
export type ObjectRequest = Base<FkPropType | LookupPropType | ObjectPropType | UnionPropType> & {
    children: FieldRequest[];
};
export type OpaqueRequest = Base<ScalarPropType | EnumPropType | ListPropType>;
export type FieldsByEntity = Record<string, FieldRequest[]>;
export type AnyFields = FieldRequest[] | FieldsByEntity;
export declare function asEntityFields(fields: AnyFields): FieldRequest[];
export declare function asQueryableFields(fields: AnyFields): FieldsByEntity;
export {};
//# sourceMappingURL=fields.d.ts.map