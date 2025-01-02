"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseWhere = parseWhere;
exports.parseWhereKey = parseWhereKey;
const util_internal_1 = require("@subsquid/util-internal");
const assert_1 = __importDefault(require("assert"));
const util_1 = require("../../util/util");
const common_1 = require("../common");
function parseWhere(whereArg) {
    if (whereArg == null)
        return undefined;
    let { AND, OR, ...fields } = whereArg;
    let conj = [];
    for (let key in fields) {
        let arg = fields[key];
        let { field, op } = parseWhereKey(key);
        switch (op) {
            case "REF":
            case "every": {
                let where = parseWhere(arg);
                where && conj.push({ op, field, where });
                break;
            }
            case "some":
            case "none":
                conj.push({ op, field, where: parseWhere(arg) });
                break;
            case "in":
            case "not_in":
                conj.push({ op, field, values: (0, util_1.ensureArray)(arg) });
                break;
            case "eq":
            case "not_eq":
            case "gt":
            case "gte":
            case "lt":
            case "lte":
            case "contains":
            case "not_contains":
            case "containsInsensitive":
            case "not_containsInsensitive":
            case "startsWith":
            case "not_startsWith":
            case "endsWith":
            case "not_endsWith":
            case "jsonHasKey":
            case "jsonContains":
                conj.push({ op, field, value: arg });
                break;
            case "containsNone":
            case "containsAll":
            case "containsAny":
                conj.push({ op, field, value: (0, util_1.ensureArray)(arg) });
                break;
            case "isNull":
                (0, assert_1.default)(typeof arg == 'boolean');
                conj.push({ op, field, yes: arg });
                break;
            default:
                throw (0, util_internal_1.unexpectedCase)(op);
        }
    }
    if (AND) {
        for (let arg of (0, util_1.ensureArray)(AND)) {
            let where = parseWhere(arg);
            if (where) {
                conj.push(where);
            }
        }
    }
    let conjunction = (0, common_1.toCondition)('AND', conj);
    if (OR) {
        let disjunctions = [];
        if (conjunction) {
            disjunctions.push(conjunction);
        }
        for (let arg of (0, util_1.ensureArray)(OR)) {
            let where = parseWhere(arg);
            if (where) {
                disjunctions.push(where);
            }
        }
        return (0, common_1.toCondition)('OR', disjunctions);
    }
    else {
        return conjunction;
    }
}
function parseWhereKey(key) {
    let m = WHERE_KEY_REGEX.exec(key);
    if (m) {
        return { op: m[2], field: m[1] };
    }
    else {
        return { op: 'REF', field: key };
    }
}
const WHERE_KEY_REGEX = (() => {
    let ops = [
        "eq",
        "not_eq",
        "gt",
        "gte",
        "lt",
        "lte",
        "contains",
        "not_contains",
        "containsInsensitive",
        "not_containsInsensitive",
        "startsWith",
        "not_startsWith",
        "endsWith",
        "not_endsWith",
        "containsAll",
        "containsAny",
        "containsNone",
        "jsonContains",
        "jsonHasKey",
        "isNull",
        "some",
        "every",
        "none",
        "in",
        "not_in",
    ];
    return new RegExp(`^([^_]*_?)_(${ops.join('|')})$`);
})();
//# sourceMappingURL=where.js.map