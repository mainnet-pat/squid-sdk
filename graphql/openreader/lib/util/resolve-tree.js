"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.simplifyResolveTree = simplifyResolveTree;
exports.getResolveTree = getResolveTree;
exports.getTreeRequest = getTreeRequest;
exports.hasTreeRequest = hasTreeRequest;
const apollo_server_core_1 = require("apollo-server-core");
const assert_1 = __importDefault(require("assert"));
const graphql_parse_resolve_info_1 = require("graphql-parse-resolve-info");
function simplifyResolveTree(schema, tree, typeName) {
    let type = schema.getType(typeName);
    (0, assert_1.default)(type != null);
    return (0, graphql_parse_resolve_info_1.simplifyParsedResolveInfoFragmentWithType)(tree, type);
}
function getResolveTree(info, typeName) {
    let tree = (0, graphql_parse_resolve_info_1.parseResolveInfo)(info);
    (0, assert_1.default)(isResolveTree(tree));
    if (typeName) {
        return simplifyResolveTree(info.schema, tree, typeName);
    }
    else {
        return tree;
    }
}
function isResolveTree(resolveInfo) {
    return resolveInfo != null && resolveInfo.fieldsByTypeName != null;
}
function getTreeRequest(treeFields, fieldName) {
    let req;
    for (let alias in treeFields) {
        let e = treeFields[alias];
        if (e.name != fieldName)
            continue;
        if (req != null)
            throw new apollo_server_core_1.UserInputError(`multiple aliases for field '${fieldName}' are not supported`);
        req = e;
    }
    return req;
}
function hasTreeRequest(treeFields, fieldName) {
    for (let alias in treeFields) {
        let e = treeFields[alias];
        if (e.name == fieldName)
            return true;
    }
    return false;
}
//# sourceMappingURL=resolve-tree.js.map