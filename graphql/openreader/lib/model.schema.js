"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaError = void 0;
exports.buildSchema = buildSchema;
exports.buildModel = buildModel;
const util_internal_1 = require("@subsquid/util-internal");
const assert_1 = __importDefault(require("assert"));
const graphql_1 = require("graphql");
const model_tools_1 = require("./model.tools");
const scalars_1 = require("./scalars");
const baseSchema = (0, graphql_1.buildASTSchema)((0, graphql_1.parse)(`
    directive @entity(queryName: String listQueryName: String) on OBJECT
    directive @query on INTERFACE
    directive @derivedFrom(field: String!) on FIELD_DEFINITION
    directive @unique on FIELD_DEFINITION
    directive @index(fields: [String!] unique: Boolean) repeatable on OBJECT | FIELD_DEFINITION
    directive @fulltext(query: String!) on FIELD_DEFINITION
    directive @cardinality(value: Int!) on OBJECT | FIELD_DEFINITION
    directive @byteWeight(value: Float!) on FIELD_DEFINITION
    directive @variant on OBJECT # legacy
    directive @jsonField on OBJECT # legacy
    scalar ID
    ${Object.keys(scalars_1.customScalars).map(name => 'scalar ' + name).join('\n')}
`));
function buildSchema(doc) {
    let schema = (0, graphql_1.extendSchema)(baseSchema, doc);
    let errors = (0, graphql_1.validateSchema)(schema).filter(err => !/query root/i.test(err.message));
    if (errors.length > 0) {
        throw errors[0];
    }
    return schema;
}
function buildModel(schema) {
    let types = schema.getTypeMap();
    let model = {};
    for (let key in types) {
        let type = types[key];
        if (isEntityType(type)) {
            addEntityOrJsonObjectOrInterface(model, type);
        }
    }
    (0, model_tools_1.validateModel)(model);
    return model;
}
function isEntityType(type) {
    return type instanceof graphql_1.GraphQLObjectType && !!type.astNode?.directives?.some(d => d.name.value == 'entity');
}
function addEntityOrJsonObjectOrInterface(model, type) {
    if (model[type.name])
        return;
    let kind = isEntityType(type)
        ? 'entity'
        : type instanceof graphql_1.GraphQLInterfaceType ? 'interface' : 'object';
    let properties = {};
    let interfaces = [];
    let indexes = type instanceof graphql_1.GraphQLObjectType ? checkEntityIndexes(type) : [];
    let cardinality = checkEntityCardinality(type);
    let description = type.description || undefined;
    switch (kind) {
        case 'entity':
            model[type.name] = {
                kind,
                properties,
                description,
                interfaces,
                indexes,
                ...cardinality,
                ...handleEntityDirective(model, type),
            };
            break;
        case 'object':
            model[type.name] = { kind, properties, description, interfaces };
            break;
        case 'interface':
            model[type.name] = { kind, properties, description, queryable: isQueryableInterface(type) };
            break;
        default:
            throw (0, util_internal_1.unexpectedCase)(kind);
    }
    let fields = type.getFields();
    if (kind == 'entity') {
        if (fields.id == null) {
            properties.id = {
                type: { kind: 'scalar', name: 'ID' },
                nullable: false
            };
        }
        else {
            let correctIdType = fields.id.type instanceof graphql_1.GraphQLNonNull
                && fields.id.type.ofType instanceof graphql_1.GraphQLScalarType
                && fields.id.type.ofType.name === 'ID';
            if (!correctIdType) {
                throw unsupportedFieldTypeError(type.name + '.id');
            }
        }
    }
    for (let key in fields) {
        let f = fields[key];
        handleFulltextDirective(model, type, f);
        let propName = `${type.name}.${f.name}`;
        let fieldType = f.type;
        let nullable = true;
        let description = f.description || undefined;
        let derivedFrom = checkDerivedFrom(type, f);
        let index = checkFieldIndex(type, f);
        let unique = index?.unique || false;
        let limits = {
            ...checkByteWeightDirective(type, f),
            ...checkCardinalityLimitDirective(type, f)
        };
        if (index) {
            indexes.push(index);
        }
        if (fieldType instanceof graphql_1.GraphQLNonNull) {
            nullable = false;
            fieldType = fieldType.ofType;
        }
        let list = unwrapList(fieldType);
        fieldType = list.item;
        if (fieldType instanceof graphql_1.GraphQLScalarType) {
            properties[key] = {
                type: wrapWithList(list.nulls, {
                    kind: 'scalar',
                    name: fieldType.name
                }),
                nullable,
                description,
                ...limits
            };
        }
        else if (fieldType instanceof graphql_1.GraphQLEnumType) {
            addEnum(model, fieldType);
            properties[key] = {
                type: wrapWithList(list.nulls, {
                    kind: 'enum',
                    name: fieldType.name
                }),
                nullable,
                description,
                ...limits
            };
        }
        else if (fieldType instanceof graphql_1.GraphQLUnionType) {
            addUnion(model, fieldType);
            properties[key] = {
                type: wrapWithList(list.nulls, {
                    kind: 'union',
                    name: fieldType.name
                }),
                nullable,
                description,
                ...limits
            };
        }
        else if (fieldType instanceof graphql_1.GraphQLObjectType) {
            if (isEntityType(fieldType) && kind != 'interface') {
                switch (list.nulls.length) {
                    case 0:
                        if (derivedFrom) {
                            if (!nullable) {
                                throw new SchemaError(`Property ${propName} must be nullable`);
                            }
                            properties[key] = {
                                type: {
                                    kind: 'lookup',
                                    entity: fieldType.name,
                                    field: derivedFrom.field
                                },
                                nullable,
                                description
                            };
                        }
                        else {
                            properties[key] = {
                                type: {
                                    kind: 'fk',
                                    entity: fieldType.name
                                },
                                nullable,
                                unique,
                                description
                            };
                        }
                        break;
                    case 1:
                        if (derivedFrom == null) {
                            throw new SchemaError(`@derivedFrom directive is required on ${propName} declaration`);
                        }
                        properties[key] = {
                            type: {
                                kind: 'list-lookup',
                                entity: fieldType.name,
                                field: derivedFrom.field
                            },
                            nullable: false,
                            description,
                            ...limits
                        };
                        break;
                    default:
                        throw unsupportedFieldTypeError(propName);
                }
            }
            else {
                addEntityOrJsonObjectOrInterface(model, fieldType);
                properties[key] = {
                    type: wrapWithList(list.nulls, {
                        kind: 'object',
                        name: fieldType.name
                    }),
                    nullable,
                    description,
                    ...limits
                };
            }
        }
        else {
            throw unsupportedFieldTypeError(propName);
        }
    }
    if (kind != 'interface') {
        type.getInterfaces().forEach(i => {
            addEntityOrJsonObjectOrInterface(model, i);
            interfaces.push(i.name);
        });
    }
}
function addUnion(model, type) {
    if (model[type.name])
        return;
    let variants = [];
    model[type.name] = {
        kind: 'union',
        variants,
        description: type.description || undefined
    };
    type.getTypes().forEach(obj => {
        if (isEntityType(obj)) {
            throw new Error(`union ${type.name} has entity ${obj.name} as a variant. Entities in union types are not supported`);
        }
        addEntityOrJsonObjectOrInterface(model, obj);
        variants.push(obj.name);
    });
}
function addEnum(model, type) {
    if (model[type.name])
        return;
    let values = {};
    model[type.name] = {
        kind: 'enum',
        values,
        description: type.description || undefined
    };
    type.getValues().forEach(item => {
        values[item.name] = {};
    });
}
function handleFulltextDirective(model, object, f) {
    f.astNode?.directives?.forEach(d => {
        if (d.name.value != 'fulltext')
            return;
        if (!isEntityType(object) || !isStringField(f)) {
            throw new Error(`@fulltext directive can be only applied to String entity fields, but was applied to ${object.name}.${f.name}`);
        }
        let queryArgument = d.arguments?.find(arg => arg.name.value == 'query');
        (0, assert_1.default)(queryArgument != null);
        (0, assert_1.default)(queryArgument.value.kind == 'StringValue');
        let queryName = queryArgument.value.value;
        let query = model[queryName];
        if (query == null) {
            query = model[queryName] = {
                kind: 'fts',
                sources: []
            };
        }
        (0, assert_1.default)(query.kind == 'fts');
        let src = query.sources.find(s => s.entity == object.name);
        if (src == null) {
            query.sources.push({
                entity: object.name,
                fields: [f.name]
            });
        }
        else {
            src.fields.push(f.name);
        }
    });
}
function isStringField(f) {
    return asScalarField(f)?.name == 'String';
}
function asScalarField(f) {
    let type = asNonNull(f);
    return type instanceof graphql_1.GraphQLScalarType ? type : undefined;
}
function asNonNull(f) {
    let type = f.type;
    if (type instanceof graphql_1.GraphQLNonNull) {
        type = type.ofType;
    }
    return type;
}
function unwrapList(type) {
    let nulls = [];
    while (type instanceof graphql_1.GraphQLList) {
        type = type.ofType;
        if (type instanceof graphql_1.GraphQLNonNull) {
            nulls.push(false);
            type = type.ofType;
        }
        else {
            nulls.push(true);
        }
    }
    return { item: type, nulls };
}
function wrapWithList(nulls, dataType) {
    if (nulls.length == 0)
        return dataType;
    return {
        kind: 'list',
        item: {
            type: wrapWithList(nulls.slice(1), dataType),
            nullable: nulls[0]
        }
    };
}
function checkFieldIndex(type, f) {
    let unique = false;
    let index = false;
    f.astNode?.directives?.forEach(d => {
        if (d.name.value == 'unique') {
            assertCanBeIndexed(type, f);
            index = true;
            unique = true;
        }
        else if (d.name.value == 'index') {
            assertCanBeIndexed(type, f);
            let fieldsArg = d.arguments?.find(arg => arg.name.value == 'fields');
            if (fieldsArg)
                throw new SchemaError(`@index(fields: ...) where applied to ${type.name}.${f.name}, but fields argument is not allowed when @index is applied to a field`);
            let uniqueArg = d.arguments?.find(arg => arg.name.value == 'unique');
            if (uniqueArg) {
                (0, assert_1.default)(uniqueArg.value.kind == 'BooleanValue');
                unique = uniqueArg.value.value;
            }
            index = true;
        }
    });
    if (!index)
        return undefined;
    return {
        fields: [{ name: f.name }],
        unique
    };
}
function assertCanBeIndexed(type, f) {
    if (!isEntityType(type))
        throw new SchemaError(`${type.name}.${f.name} can't be indexed, because ${type.name} is not an entity`);
    if (!canBeIndexed(f))
        throw new SchemaError(`${type.name}.${f.name} can't be indexed, it is not a scalar, enum or foreign key`);
}
function canBeIndexed(f) {
    let type = asNonNull(f);
    if (type instanceof graphql_1.GraphQLScalarType || type instanceof graphql_1.GraphQLEnumType)
        return true;
    return isEntityType(type) && !f.astNode?.directives?.some(d => d.name.value == 'derivedFrom');
}
function checkEntityIndexes(type) {
    let indexes = [];
    type.astNode?.directives?.forEach(d => {
        if (d.name.value != 'index')
            return;
        if (!isEntityType(type))
            throw new SchemaError(`@index was applied to ${type.name}, but only entities can have indexes`);
        let fieldsArg = d.arguments?.find(arg => arg.name.value == 'fields');
        if (fieldsArg == null)
            throw new SchemaError(`@index was applied to ${type.name}, but no fields were specified`);
        (0, assert_1.default)(fieldsArg.value.kind == 'ListValue');
        if (fieldsArg.value.values.length == 0)
            throw new SchemaError(`@index was applied to ${type.name}, but no fields were specified`);
        let fields = fieldsArg.value.values.map(arg => {
            (0, assert_1.default)(arg.kind == 'StringValue');
            let name = arg.value;
            let f = type.getFields()[name];
            if (f == null)
                throw new SchemaError(`Entity ${type.name} doesn't have a field '${name}', but it is a part of @index`);
            assertCanBeIndexed(type, f);
            return { name };
        });
        indexes.push({
            fields,
            unique: !!d.arguments?.find(arg => arg.name.value == 'unique')?.value
        });
    });
    return indexes;
}
function checkDerivedFrom(type, f) {
    let directives = f.astNode?.directives?.filter(d => d.name.value == 'derivedFrom') || [];
    if (directives.length == 0)
        return undefined;
    if (!isEntityType(type))
        throw new SchemaError(`@derivedFrom where applied to ${type.name}.${f.name}, but only entities can have lookup fields`);
    if (directives.length > 1)
        throw new SchemaError(`Multiple @derivedFrom where applied to ${type.name}.${f.name}`);
    let d = directives[0];
    let fieldArg = (0, util_internal_1.assertNotNull)(d.arguments?.find(arg => arg.name.value == 'field'));
    (0, assert_1.default)(fieldArg.value.kind == 'StringValue');
    return { field: fieldArg.value.value };
}
function checkEntityCardinality(type) {
    let directives = type.astNode?.directives?.filter(d => d.name.value == 'cardinality') || [];
    if (directives.length > 0 && !isEntityType(type)) {
        throw new SchemaError(`@cardinality directive can be only applied to entities, but were applied to ${type.name}`);
    }
    if (directives.length > 1)
        throw new SchemaError(`Multiple @cardinality directives where applied to ${type.name}`);
    if (directives.length == 0)
        return {};
    let arg = (0, util_internal_1.assertNotNull)(directives[0].arguments?.find(arg => arg.name.value == 'value'));
    (0, assert_1.default)(arg.value.kind == 'IntValue');
    let cardinality = parseInt(arg.value.value, 10);
    if (cardinality < 0)
        throw new SchemaError(`Incorrect @cardinality where applied to ${type.name}. Cardinality value must be positive.`);
    return { cardinality };
}
function checkCardinalityLimitDirective(type, f) {
    let directives = f.astNode?.directives?.filter(d => d.name.value == 'cardinality') || [];
    if (directives.length > 1)
        throw new SchemaError(`Multiple @cardinality directives where applied to ${type.name}.${f.name}`);
    if (directives.length == 0)
        return {};
    let arg = (0, util_internal_1.assertNotNull)(directives[0].arguments?.find(arg => arg.name.value == 'value'));
    (0, assert_1.default)(arg.value.kind == 'IntValue');
    let cardinality = parseInt(arg.value.value, 10);
    if (cardinality < 0)
        throw new SchemaError(`Incorrect @cardinality where applied to ${type.name}.${f.name}. Cardinality value must be positive.`);
    return { cardinality };
}
function checkByteWeightDirective(type, f) {
    let directives = f.astNode?.directives?.filter(d => d.name.value == 'byteWeight') || [];
    if (directives.length > 1)
        throw new SchemaError(`Multiple @byteWeight directives where applied to ${type.name}.${f.name}`);
    if (directives.length == 0)
        return {};
    let arg = (0, util_internal_1.assertNotNull)(directives[0].arguments?.find(arg => arg.name.value == 'value'));
    (0, assert_1.default)(arg.value.kind == 'FloatValue');
    let byteWeight = parseFloat(arg.value.value);
    if (byteWeight < 0)
        throw new SchemaError(`Incorrect @byteWeight where applied to ${type.name}.${f.name}. Byte weight value must be positive.`);
    return { byteWeight };
}
function isQueryableInterface(type) {
    return type instanceof graphql_1.GraphQLInterfaceType
        && !!type.astNode?.directives?.find(d => d.name.value == 'query');
}
function unsupportedFieldTypeError(propName) {
    return new SchemaError(`Property ${propName} has unsupported type`);
}
function handleEntityDirective(model, type) {
    let directive = type.astNode?.directives?.find(d => d.name.value == 'entity');
    if (directive == null)
        return;
    let queryNameArg = directive.arguments?.find(d => d.name.value === 'queryName');
    let queryName;
    if (queryNameArg != null) {
        (0, assert_1.default)(queryNameArg?.value.kind == 'StringValue');
        queryName = queryNameArg.value.value;
    }
    let listQueryNameArg = directive.arguments?.find(d => d.name.value === 'listQueryName');
    let listQueryName;
    if (listQueryNameArg != null) {
        (0, assert_1.default)(listQueryNameArg?.value.kind == 'StringValue');
        listQueryName = listQueryNameArg.value.value;
    }
    return {
        queryName,
        listQueryName,
    };
}
class SchemaError extends Error {
}
exports.SchemaError = SchemaError;
//# sourceMappingURL=model.schema.js.map