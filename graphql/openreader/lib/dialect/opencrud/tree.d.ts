import { GraphQLSchema } from 'graphql';
import { ResolveTree } from 'graphql-parse-resolve-info';
import { SqlArguments } from '../../ir/args';
import { AnyFields, FieldRequest, FieldsByEntity } from '../../ir/fields';
import { Model } from '../../model';
export declare function parseObjectTree(model: Model, typeName: string, schema: GraphQLSchema, tree: ResolveTree): FieldRequest[];
export declare function parseSqlArguments(model: Model, typeName: string, gqlArgs: any): SqlArguments;
export declare function parseQueryableTree(model: Model, queryableName: string, schema: GraphQLSchema, tree: ResolveTree): FieldsByEntity;
export declare function parseAnyTree(model: Model, typeName: string, schema: GraphQLSchema, tree: ResolveTree): AnyFields;
//# sourceMappingURL=tree.d.ts.map