"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapRows = mapRows;
exports.mapRow = mapRow;
exports.mapQueryableRows = mapQueryableRows;
exports.mapQueryableRow = mapQueryableRow;
const util_internal_1 = require("@subsquid/util-internal");
function mapRows(rows, fields) {
    let result = new Array(rows.length);
    for (let i = 0; i < rows.length; i++) {
        result[i] = mapRow(rows[i], fields);
    }
    return result;
}
function mapRow(row, fields, ifType) {
    let rec = {};
    for (let f of fields) {
        if (f.ifType != ifType)
            continue;
        for (let alias of f.aliases) {
            switch (f.kind) {
                case "scalar":
                case "enum":
                case "list":
                    rec[alias] = row[f.index];
                    break;
                case "object": {
                    let isNull = row[f.index];
                    rec[alias] = isNull ? null : mapRow(row, f.children);
                    break;
                }
                case "union": {
                    let isTypeOf = row[f.index];
                    if (isTypeOf) {
                        let obj = mapRow(row, f.children, isTypeOf);
                        obj.isTypeOf = isTypeOf;
                        rec[alias] = obj;
                    }
                    else {
                        rec[alias] = null;
                    }
                    break;
                }
                case "fk":
                case "lookup": {
                    let id = row[f.index];
                    if (id == null) {
                        rec[alias] = null;
                    }
                    else {
                        rec[alias] = mapRow(row, f.children);
                    }
                    break;
                }
                case "list-lookup": {
                    let rows = row[f.index];
                    if (rows == null) {
                        rec[alias] = [];
                    }
                    else {
                        rec[alias] = mapRows(rows, f.children);
                    }
                    break;
                }
                default:
                    throw (0, util_internal_1.unexpectedCase)(f.kind);
            }
        }
    }
    return rec;
}
function mapQueryableRows(rows, fields) {
    let result = new Array(rows.length);
    for (let i = 0; i < rows.length; i++) {
        result[i] = mapQueryableRow(rows[i], fields);
    }
    return result;
}
function mapQueryableRow(row, fields) {
    let entity = row[0];
    let rec = mapRow(row[1], fields[entity]);
    rec._isTypeOf = entity;
    return rec;
}
//# sourceMappingURL=mapping.js.map