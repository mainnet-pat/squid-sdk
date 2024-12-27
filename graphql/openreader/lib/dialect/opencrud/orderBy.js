"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderByMapping = getOrderByMapping;
exports.parseOrderBy = parseOrderBy;
const assert_1 = __importDefault(require("assert"));
const model_tools_1 = require("../../model.tools");
const common_1 = require("../common");
const MAPPING_CACHE = new WeakMap();
function getOrderByMapping(model, typeName) {
    let cache = MAPPING_CACHE.get(model);
    if (cache == null) {
        cache = {};
        MAPPING_CACHE.set(model, cache);
    }
    if (cache[typeName])
        return cache[typeName];
    return cache[typeName] = buildOrderByMapping(model, typeName, 2);
}
function buildOrderByMapping(model, typeName, depth) {
    if (depth <= 0)
        return new Map();
    let properties = (0, model_tools_1.getUniversalProperties)(model, typeName);
    let m = new Map();
    for (let key in properties) {
        let propType = properties[key].type;
        switch (propType.kind) {
            case 'scalar':
            case 'enum':
                if (propType.name != 'JSON') {
                    m.set(key + '_ASC', { [key]: 'ASC' });
                    m.set(key + '_DESC', { [key]: 'DESC' });
                    m.set(key + '_ASC_NULLS_FIRST', { [key]: 'ASC NULLS FIRST' });
                    m.set(key + '_ASC_NULLS_LAST', { [key]: 'ASC NULLS LAST' });
                    m.set(key + '_DESC_NULLS_FIRST', { [key]: 'DESC NULLS FIRST' });
                    m.set(key + '_DESC_NULLS_LAST', { [key]: 'DESC NULLS LAST' });
                }
                break;
            case 'object':
            case 'union':
                for (let [name, spec] of buildOrderByMapping(model, propType.name, depth - 1)) {
                    m.set(key + '_' + name, { [key]: spec });
                }
                break;
            case 'fk':
            case 'lookup':
                for (let [name, spec] of buildOrderByMapping(model, propType.entity, depth - 1)) {
                    m.set(key + '_' + name, { [key]: spec });
                }
                break;
        }
    }
    if (model[typeName].kind == 'interface') {
        m.set('_type_ASC', { _type: 'ASC' });
        m.set('_type_DESC', { _type: 'DESC' });
    }
    return m;
}
function parseOrderBy(model, typeName, input) {
    let mapping = getOrderByMapping(model, typeName);
    return (0, common_1.mergeOrderBy)(input.map(value => {
        let spec = mapping.get(value);
        (0, assert_1.default)(spec != null);
        return spec;
    }));
}
//# sourceMappingURL=orderBy.js.map