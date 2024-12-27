"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseObjectTree = parseObjectTree;
exports.parseSqlArguments = parseSqlArguments;
exports.parseQueryableTree = parseQueryableTree;
exports.parseAnyTree = parseAnyTree;
const util_internal_1 = require("@subsquid/util-internal");
const assert_1 = __importDefault(require("assert"));
const model_tools_1 = require("../../model.tools");
const resolve_tree_1 = require("../../util/resolve-tree");
const util_1 = require("../../util/util");
const orderBy_1 = require("./orderBy");
const where_1 = require("./where");
function parseObjectTree(model, typeName, schema, tree) {
    let requests = [];
    let requestedScalars = {};
    let object = model[typeName];
    (0, assert_1.default)(object.kind == "entity" || object.kind == "object");
    let fields = (0, resolve_tree_1.simplifyResolveTree)(schema, tree, typeName).fields;
    for (let alias in fields) {
        let f = fields[alias];
        let prop = object.properties[f.name];
        switch (prop.type.kind) {
            case "scalar":
            case "enum":
            case "list":
                if (requestedScalars[f.name] == null) {
                    requestedScalars[f.name] = true;
                    requests.push({
                        field: f.name,
                        aliases: [f.name],
                        kind: prop.type.kind,
                        type: prop.type,
                        prop,
                        index: 0
                    });
                }
                break;
            case "object":
                requests.push({
                    field: f.name,
                    aliases: [f.alias],
                    kind: prop.type.kind,
                    type: prop.type,
                    prop,
                    index: 0,
                    children: parseObjectTree(model, prop.type.name, schema, f)
                });
                break;
            case "union": {
                let union = model[prop.type.name];
                (0, assert_1.default)(union.kind == "union");
                let children = [];
                for (let variant of union.variants) {
                    for (let req of parseObjectTree(model, variant, schema, f)) {
                        req.ifType = variant;
                        children.push(req);
                    }
                }
                requests.push({
                    field: f.name,
                    aliases: [f.alias],
                    kind: prop.type.kind,
                    type: prop.type,
                    prop,
                    index: 0,
                    children
                });
                break;
            }
            case "fk":
                requests.push({
                    field: f.name,
                    aliases: [f.alias],
                    kind: prop.type.kind,
                    type: prop.type,
                    prop,
                    index: 0,
                    children: parseObjectTree(model, prop.type.entity, schema, f)
                });
                break;
            case "lookup":
                requests.push({
                    field: f.name,
                    aliases: [f.alias],
                    kind: prop.type.kind,
                    type: prop.type,
                    prop,
                    index: 0,
                    children: parseObjectTree(model, prop.type.entity, schema, f)
                });
                break;
            case "list-lookup":
                requests.push({
                    field: f.name,
                    aliases: [f.alias],
                    kind: prop.type.kind,
                    type: prop.type,
                    prop,
                    index: 0,
                    args: parseSqlArguments(model, prop.type.entity, f.args),
                    children: parseObjectTree(model, prop.type.entity, schema, f)
                });
                break;
            default:
                throw (0, util_internal_1.unexpectedCase)();
        }
    }
    return requests;
}
function parseSqlArguments(model, typeName, gqlArgs) {
    let args = {};
    let where = (0, where_1.parseWhere)(gqlArgs.where);
    if (where) {
        args.where = where;
    }
    if (gqlArgs.orderBy) {
        args.orderBy = (0, orderBy_1.parseOrderBy)(model, typeName, (0, util_1.ensureArray)(gqlArgs.orderBy));
    }
    if (gqlArgs.offset) {
        (0, assert_1.default)(typeof gqlArgs.offset == "number");
        args.offset = gqlArgs.offset;
    }
    if (gqlArgs.limit != null) {
        (0, assert_1.default)(typeof gqlArgs.limit == "number");
        args.limit = gqlArgs.limit;
    }
    return args;
}
function parseQueryableTree(model, queryableName, schema, tree) {
    let fields = {};
    for (let entity of (0, model_tools_1.getQueryableEntities)(model, queryableName)) {
        fields[entity] = parseObjectTree(model, entity, schema, tree);
    }
    return fields;
}
function parseAnyTree(model, typeName, schema, tree) {
    if (model[typeName].kind == 'interface') {
        return parseQueryableTree(model, typeName, schema, tree);
    }
    else {
        return parseObjectTree(model, typeName, schema, tree);
    }
}
//# sourceMappingURL=tree.js.map