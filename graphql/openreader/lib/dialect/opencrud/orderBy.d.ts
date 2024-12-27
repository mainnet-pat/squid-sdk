import type { Model } from "../../model";
import { OrderBy } from "../../ir/args";
/**
 * OpenCRUD orderBy enum value (e.g. foo_ASC)
 */
export type OpenCrudOrderByValue = string;
/**
 * A mapping between OpenCRUD enum variants and OrderBy specs
 */
export type OpenCrud_OrderBy_Mapping = ReadonlyMap<OpenCrudOrderByValue, OrderBy>;
export declare function getOrderByMapping(model: Model, typeName: string): OpenCrud_OrderBy_Mapping;
export declare function parseOrderBy(model: Model, typeName: string, input: OpenCrudOrderByValue[]): OrderBy;
//# sourceMappingURL=orderBy.d.ts.map