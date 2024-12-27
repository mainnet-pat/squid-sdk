"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getObjectSize = getObjectSize;
exports.getListSize = getListSize;
exports.getConnectionSize = getConnectionSize;
const util_internal_1 = require("@subsquid/util-internal");
const assert_1 = __importDefault(require("assert"));
const model_tools_1 = require("./model.tools");
function getObjectSize(model, fields) {
    let total = 0;
    for (let req of fields) {
        let size = getFieldSize(model, req);
        if (Number.isFinite(size)) {
            total += size * req.aliases.length;
        }
        else {
            return Infinity;
        }
    }
    return total;
}
function getFieldSize(model, req) {
    switch (req.kind) {
        case "scalar":
        case "list":
            return req.prop.byteWeight || 1;
        case "enum":
            return 1;
        case "object":
        case "fk":
        case "lookup":
        case "union":
            return getObjectSize(model, req.children) + 1;
        case "list-lookup":
            return getListSize(model, req.type.entity, req.children, Math.min(req.args?.limit ?? Infinity, req.prop.cardinality ?? Infinity), req.args?.where) + 1;
        default:
            throw (0, util_internal_1.unexpectedCase)();
    }
}
function getListSize(model, typeName, fields, limit, where) {
    let cardinality = getCardinality(model, typeName, limit, where);
    if (!Number.isFinite(cardinality))
        return Infinity;
    let type = model[typeName];
    switch (type.kind) {
        case 'entity': {
            (0, assert_1.default)(Array.isArray(fields));
            return cardinality * Math.max(getObjectSize(model, fields), 1);
        }
        case 'interface': {
            (0, assert_1.default)(!Array.isArray(fields));
            let weight = 1;
            for (let entity of (0, model_tools_1.getQueryableEntities)(model, typeName)) {
                weight = Math.max(weight, getObjectSize(model, fields[entity] || []));
            }
            return cardinality * weight;
        }
        default:
            throw (0, util_internal_1.unexpectedCase)(type.kind);
    }
}
function getCardinality(model, typeName, limit, where) {
    let type = model[typeName];
    switch (type.kind) {
        case 'entity':
            return Math.min(type.cardinality ?? Infinity, limit ?? Infinity, getWhereCardinality(where));
        case 'interface': {
            let whereCardinality = getWhereCardinality(where);
            let cardinality = 0;
            for (let entity of (0, model_tools_1.getQueryableEntities)(model, typeName)) {
                cardinality += Math.min((0, model_tools_1.getEntity)(model, entity).cardinality ?? Infinity, whereCardinality);
            }
            return Math.min(cardinality, limit ?? Infinity);
        }
        default:
            throw (0, util_internal_1.unexpectedCase)(type.kind);
    }
}
function getWhereCardinality(where) {
    if (where == null)
        return Infinity;
    switch (where.op) {
        case 'AND': {
            let min = Infinity;
            for (let co of where.args) {
                min = Math.min(min, getWhereCardinality(co));
            }
            return min;
        }
        case 'OR': {
            if (where.args.length == 0)
                return Infinity;
            let max = 0;
            for (let co of where.args) {
                max = Math.max(max, getWhereCardinality(co));
            }
            return max;
        }
        case 'eq':
            if (where.field == 'id') {
                return 1;
            }
            else {
                return Infinity;
            }
        case 'in':
            if (where.field == 'id') {
                return where.values.length;
            }
            else {
                return Infinity;
            }
        default:
            return Infinity;
    }
}
function getConnectionSize(model, typeName, req) {
    let first = req.first ?? 100;
    let total = 0;
    if (req.edgeNode) {
        total += getListSize(model, typeName, req.edgeNode, first, req.where);
    }
    if (req.edgeCursor) {
        total += getCardinality(model, typeName, first, req.where);
    }
    if (req.pageInfo) {
        total += 4;
    }
    if (req.totalCount) {
        total += 1;
    }
    return total;
}
//# sourceMappingURL=limit.size.js.map