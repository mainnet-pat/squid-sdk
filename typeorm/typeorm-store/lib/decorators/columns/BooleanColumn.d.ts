import { ColumnCommonOptions } from './common';
export type BooleanColumnOptions = Pick<ColumnCommonOptions, 'name' | 'unique' | 'nullable' | 'default' | 'comment' | 'array'>;
/**
 * BooleanColumn decorator is used to mark a specific class property as a `bool` table column.
 * Column value is transformed to `boolean` type.
 */
export declare function BooleanColumn(options?: BooleanColumnOptions): PropertyDecorator;
//# sourceMappingURL=BooleanColumn.d.ts.map