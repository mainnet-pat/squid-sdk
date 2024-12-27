"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnionProps = getUnionProps;
exports.buildUnionProps = buildUnionProps;
exports.getQueryableEntities = getQueryableEntities;
exports.getQueryableProperties = getQueryableProperties;
exports.getUniversalProperties = getUniversalProperties;
exports.validateModel = validateModel;
exports.validateNames = validateNames;
exports.validateUnionTypes = validateUnionTypes;
exports.validateLookups = validateLookups;
exports.validateIndexes = validateIndexes;
exports.validateQueryableInterfaces = validateQueryableInterfaces;
exports.propTypeEquals = propTypeEquals;
exports.getEntity = getEntity;
exports.getObject = getObject;
exports.getInterface = getInterface;
exports.getFtsQuery = getFtsQuery;
const util_internal_1 = require("@subsquid/util-internal");
const assert_1 = __importDefault(require("assert"));
const UNION_MAPS = new WeakMap();
function getUnionProps(model, unionName) {
    let map = UNION_MAPS.get(model);
    if (map == null) {
        map = {};
        UNION_MAPS.set(model, map);
    }
    if (map[unionName])
        return map[unionName];
    return map[unionName] = buildUnionProps(model, unionName);
}
function buildUnionProps(model, unionName) {
    let union = model[unionName];
    (0, assert_1.default)(union.kind == 'union');
    let properties = {};
    for (let objectName of union.variants) {
        let object = model[objectName];
        (0, assert_1.default)(object.kind == 'object');
        Object.assign(properties, object.properties);
    }
    properties.isTypeOf = {
        type: { kind: 'scalar', name: 'String' },
        nullable: false
    };
    return { kind: 'object', properties };
}
const QUERYABLE_ENTITIES = new WeakMap();
function getQueryableEntities(model, queryableName) {
    let cache = QUERYABLE_ENTITIES.get(model);
    if (cache == null) {
        cache = {};
        QUERYABLE_ENTITIES.set(model, cache);
    }
    let entities = cache[queryableName];
    if (entities)
        return entities;
    entities = cache[queryableName] = [];
    for (let name in model) {
        let item = model[name];
        if (item.kind == 'entity' && item.interfaces?.includes(queryableName)) {
            entities.push(name);
        }
    }
    return entities;
}
function getQueryableProperties(model, queryableName) {
    let queryable = getInterface(model, queryableName);
    let props = {};
    for (let entityName of getQueryableEntities(model, queryableName)) {
        let entity = getEntity(model, entityName);
        for (let key in queryable.properties) {
            let ep = entity.properties[key];
            if (ep == null)
                throw new Error(`Entity ${entityName} doesn't implement ${queryableName} properly: .${key} property is missing`);
            let prop = matchWithQueryableProp(queryable.properties[key], ep);
            if (prop == null)
                throw new Error(`Entity ${entityName} doesn't implement ${queryableName} properly: .${key} property types are incompatible`);
            props[key] = prop;
        }
    }
    return props;
}
function matchWithQueryableProp(queryableProp, entityProp) {
    if (!queryableProp.nullable && entityProp.nullable)
        return undefined;
    let qt = queryableProp.type;
    let et = entityProp.type;
    switch (et.kind) {
        case 'fk':
        case 'lookup':
            if (qt.kind == 'object' && qt.name == et.entity) {
                return {
                    type: et,
                    nullable: queryableProp.nullable,
                    description: queryableProp.description
                };
            }
            return undefined;
        case 'list-lookup':
            if (qt.kind == 'list' && qt.item.type.kind == 'object' && qt.item.type.name == et.entity) {
                return {
                    type: et,
                    nullable: false,
                    description: queryableProp.description
                };
            }
            return undefined;
        default:
            if (propTypeEquals(et, qt)) {
                return queryableProp;
            }
            return undefined;
    }
}
function getUniversalProperties(model, typeName) {
    let item = model[typeName];
    switch (item.kind) {
        case 'entity':
        case 'object':
            return item.properties;
        case 'union':
            return getUnionProps(model, typeName).properties;
        case 'interface':
            (0, assert_1.default)(item.queryable);
            return getQueryableProperties(model, typeName);
        default:
            throw (0, util_internal_1.unexpectedCase)(item.kind);
    }
}
function validateModel(model) {
    // TODO: check all invariants we assume
    validateNames(model);
    validateUnionTypes(model);
    validateLookups(model);
    validateIndexes(model);
    validateQueryableInterfaces(model);
}
const TYPE_NAME_REGEX = /^[A-Z][a-zA-Z0-9_]*$/;
const PROP_NAME_REGEX = /^[a-z][a-zA-Z0-9_]*$/;
function validateNames(model) {
    for (let name in model) {
        let item = model[name];
        if (item.kind == 'fts') {
            if (!PROP_NAME_REGEX.test(name)) {
                throw new Error(`Invalid fulltext search name: ${name}. It must match ${PROP_NAME_REGEX}.`);
            }
        }
        else {
            if (!TYPE_NAME_REGEX.test(name)) {
                throw new Error(`Invalid ${item.kind} name: ${name}. It must match ${TYPE_NAME_REGEX}`);
            }
        }
        switch (item.kind) {
            case 'entity':
            case 'object':
            case 'interface':
                for (let prop in item.properties) {
                    if (!PROP_NAME_REGEX.test(prop)) {
                        throw new Error(`Type ${name} has a property with invalid name: ${prop}. It must match ${PROP_NAME_REGEX}.`);
                    }
                }
                break;
        }
    }
}
function validateUnionTypes(model) {
    for (let key in model) {
        let item = model[key];
        if (item.kind != 'union')
            continue;
        let properties = {};
        item.variants.forEach(objectName => {
            let object = model[objectName];
            (0, assert_1.default)(object.kind == 'object');
            for (let propName in object.properties) {
                let rec = properties[propName];
                if (rec && !propTypeEquals(rec.type, object.properties[propName].type)) {
                    throw new Error(`${rec.objectName} and ${objectName} variants of union ${key} both have property '${propName}', but types of ${rec.objectName}.${propName} and ${objectName}.${propName} are different.`);
                }
                else {
                    properties[propName] = { objectName, type: object.properties[propName].type };
                }
            }
        });
    }
}
function validateLookups(model) {
    for (let name in model) {
        let item = model[name];
        switch (item.kind) {
            case 'object':
            case 'interface':
                for (let key in item.properties) {
                    let prop = item.properties[key];
                    if (prop.type.kind == 'lookup' || prop.type.kind == 'list-lookup') {
                        throw invalidProperty(name, key, `lookups are only supported on entity types`);
                    }
                }
                break;
            case 'entity':
                for (let key in item.properties) {
                    let prop = item.properties[key];
                    if (prop.type.kind == 'lookup' && !prop.nullable) {
                        throw invalidProperty(name, key, 'one-to-one lookups must be nullable');
                    }
                    if (prop.type.kind == 'lookup' || prop.type.kind == 'list-lookup') {
                        let lookupEntity = getEntity(model, prop.type.entity);
                        let lookupProperty = lookupEntity.properties[prop.type.field];
                        if (lookupProperty?.type.kind != 'fk' || lookupProperty.type.entity != name) {
                            throw invalidProperty(name, key, `${prop.type.entity}.${prop.type.field} is not a foreign key pointing to ${name}`);
                        }
                        if (prop.type.kind == 'lookup' && !lookupProperty.unique) {
                            throw invalidProperty(name, key, `${prop.type.entity}.${prop.type.field} is not @unique`);
                        }
                    }
                }
                break;
        }
    }
}
function validateIndexes(model) {
    for (let name in model) {
        const item = model[name];
        if (item.kind != 'entity')
            continue;
        item.indexes?.forEach(index => {
            if (index.fields.length == 0)
                throw new Error(`Entity ${name} has an index without fields`);
            index.fields.forEach(f => {
                let prop = item.properties[f.name];
                if (prop == null)
                    throw new Error(`Entity ${name} doesn't have a property ${f.name}, but it is a part of index`);
                switch (prop.type.kind) {
                    case "scalar":
                    case "enum":
                    case "fk":
                        break;
                    default:
                        throw new Error(`Property ${name}.${f.name} can't be a part of index`);
                }
            });
        });
    }
}
function validateQueryableInterfaces(model) {
    for (let name in model) {
        let item = model[name];
        if (item.kind == 'interface' && item.queryable) {
            getQueryableProperties(model, name);
        }
    }
}
function invalidProperty(item, key, msg) {
    return new Error(`Invalid property ${item}.${key}: ${msg}`);
}
function propTypeEquals(a, b) {
    if (a.kind != b.kind)
        return false;
    switch (a.kind) {
        case 'list':
            return a.item.nullable == b.item.nullable
                && propTypeEquals(a.item.type, b.item.type);
        case 'fk':
            return a.entity == b.entity;
        case 'lookup':
        case 'list-lookup':
            return a.entity == b.entity && a.field == b.field;
        default:
            return a.name == b.name;
    }
}
function getEntity(model, name) {
    let entity = model[name];
    (0, assert_1.default)(entity.kind == 'entity', `${name} expected to be an entity`);
    return entity;
}
function getObject(model, name) {
    let object = model[name];
    (0, assert_1.default)(object.kind == 'object', `${name} expected to be an object`);
    return object;
}
function getInterface(model, name) {
    let i = model[name];
    (0, assert_1.default)(i.kind == 'interface', `${name} expected to be an interface`);
    return i;
}
function getFtsQuery(model, name) {
    let query = model[name];
    (0, assert_1.default)(query.kind == 'fts', `${name} expected to be FTS query`);
    return query;
}
//# sourceMappingURL=model.tools.js.map