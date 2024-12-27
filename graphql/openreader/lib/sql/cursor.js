"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectCursor = exports.EntityCursor = void 0;
const util_internal_1 = require("@subsquid/util-internal");
const util_naming_1 = require("@subsquid/util-naming");
const assert_1 = __importDefault(require("assert"));
const model_tools_1 = require("../model.tools");
const util_1 = require("../util/util");
const util_2 = require("./util");
class EntityCursor {
    constructor(ctx, entityName, joined) {
        this.ctx = ctx;
        this.entityName = entityName;
        this.entity = (0, model_tools_1.getEntity)(this.ctx.model, this.entityName);
        this.table = (0, util_1.toTable)(this.entityName);
        if (joined) {
            this.tableAlias = this.ctx.join.add(this.table, this._columnName(joined.on), joined.rhs);
        }
        else {
            this.tableAlias = this.ctx.aliases.add(this.table);
        }
    }
    ident(name) {
        return (0, util_2.escapeIdentifier)(this.ctx.dialect, name);
    }
    column(field) {
        return this.ident(this.tableAlias) + "." + this.ident(this._columnName(field));
    }
    _columnName(field) {
        let prop = this.prop(field);
        if (prop.type.kind == 'fk') {
            return (0, util_1.toFkColumn)(field);
        }
        else {
            return (0, util_1.toColumn)(field);
        }
    }
    prop(field) {
        return (0, util_internal_1.assertNotNull)(this.entity.properties[field], `property ${field} is missing`);
    }
    output(field) {
        let col = this.column(field);
        let prop = this.prop(field);
        switch (prop.type.kind) {
            case "scalar":
                switch (prop.type.name) {
                    case "BigInt":
                    case "BigDecimal":
                        return `(${col})::text`;
                    case "Bytes":
                        return `'0x' || encode(${col}, 'hex')`;
                    case "DateTime":
                        if (this.ctx.dialect == "cockroach") {
                            return `experimental_strftime((${col}) at time zone 'UTC', '%Y-%m-%dT%H:%M:%S.%fZ')`;
                        }
                        else {
                            return `to_char((${col}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
                        }
                    default:
                        return col;
                }
            case "enum":
                return col;
            case "list": {
                let itemType = prop.type.item.type;
                switch (itemType.kind) {
                    case "scalar":
                        switch (itemType.name) {
                            case "BigInt":
                            case "BigDecimal":
                                return `(${col})::text[]`;
                            case "Bytes":
                                return `array(select '0x' || encode(i, 'hex') from unnest(${col}) as i)`;
                            case "DateTime":
                                if (this.ctx.dialect == "cockroach") {
                                    return `array(select experimental_strftime(i at time zone 'UTC', '%Y-%m-%dT%H:%M:%S.%fZ') from unnest(${col}) as i)`;
                                }
                                else {
                                    return `array(select to_char(i at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') from unnest(${col}) as i)`;
                                }
                            default:
                                return col;
                        }
                    default:
                        return col;
                }
            }
            default:
                throw (0, util_internal_1.unexpectedCase)(prop.type.kind);
        }
    }
    native(field) {
        let prop = this.prop(field);
        switch (prop.type.kind) {
            case "fk":
            case "scalar":
            case "enum":
                return this.column(field);
            default:
                throw (0, util_internal_1.unexpectedCase)(prop.type.kind);
        }
    }
    ref(field) {
        let prop = this.prop(field);
        switch (prop.type.kind) {
            case "fk":
            case "scalar":
            case "enum":
            case "union":
            case "object":
            case "list":
                return this.column(field);
            default:
                throw (0, util_internal_1.unexpectedCase)(prop.type.kind);
        }
    }
    child(field) {
        let prop = this.entity.properties[field];
        switch (prop.type.kind) {
            case "object":
            case "union":
                return new ObjectCursor(this.ctx, this.column(field), prop.type);
            case "fk":
                return new EntityCursor(this.ctx, prop.type.entity, { on: 'id', rhs: this.native(field) });
            case "lookup":
                return new EntityCursor(this.ctx, prop.type.entity, { on: prop.type.field, rhs: this.column('id') });
            default:
                throw (0, util_internal_1.unexpectedCase)(prop.type.kind);
        }
    }
    tsv(queryName) {
        return this.ident(this.tableAlias) + "." + this.ident((0, util_naming_1.toSnakeCase)(queryName) + "_tsv");
    }
    doc(queryName) {
        let query = (0, model_tools_1.getFtsQuery)(this.ctx.model, queryName);
        let src = query.sources.find(src => src.entity == this.entityName);
        (0, assert_1.default)(src != null);
        return src.fields.map(f => `coalesce(${this.column(f)}, '')`).join(` || E'\\n\\n' || `);
    }
}
exports.EntityCursor = EntityCursor;
class ObjectCursor {
    constructor(ctx, prefix, type) {
        this.ctx = ctx;
        this.prefix = prefix;
        if (type.kind == 'union') {
            this.isUnion = true;
            this.object = (0, model_tools_1.getUnionProps)(this.ctx.model, type.name);
        }
        else {
            this.isUnion = false;
            this.object = (0, model_tools_1.getObject)(this.ctx.model, type.name);
        }
    }
    json(field) {
        return `${this.prefix}->'${field}'`;
    }
    string(field) {
        return `${this.prefix}->>'${field}'`;
    }
    prop(field) {
        return (0, util_internal_1.assertNotNull)(this.object.properties[field], `property ${field} is missing`);
    }
    output(field) {
        let prop = this.prop(field);
        switch (prop.type.kind) {
            case "scalar":
                switch (prop.type.name) {
                    case 'Int':
                        return `(${this.json(field)})::integer`;
                    case 'Float':
                        return `(${this.json(field)})::numeric`;
                    case 'Boolean':
                        return `(${this.string(field)})::bool`;
                    case 'JSON':
                        return this.json(field);
                    default:
                        return this.string(field);
                }
            case "enum":
                return this.string(field);
            case "list":
                return this.json(field);
            default:
                throw (0, util_internal_1.unexpectedCase)(prop.type.kind);
        }
    }
    native(field) {
        let prop = this.prop(field);
        switch (prop.type.kind) {
            case "fk":
            case "enum":
                return this.string(field);
            case "scalar":
                switch (prop.type.name) {
                    case 'Int':
                        return `(${this.json(field)})::integer`;
                    case 'Float':
                        return `(${this.json(field)})::numeric`;
                    case 'Boolean':
                        return `(${this.string(field)})::bool`;
                    case 'BigInt':
                        return `(${this.string(field)})::numeric`;
                    case 'BigDecimal':
                        return `(${this.string(field)})::numeric`;
                    case 'Bytes':
                        return `decode(substr(${this.string(field)}, 3), 'hex')`;
                    case 'DateTime':
                        return `(${this.string(field)})::timestamptz`;
                    default:
                        return this.string(field);
                }
            default:
                throw (0, util_internal_1.unexpectedCase)(prop.type.kind);
        }
    }
    ref(field) {
        return this.json(field);
    }
    child(field) {
        let prop = this.prop(field);
        switch (prop.type.kind) {
            case "object":
            case "union":
                return new ObjectCursor(this.ctx, this.json(field), prop.type);
            case "fk":
                return new EntityCursor(this.ctx, prop.type.entity, { on: 'id', rhs: this.string(field) });
            default:
                throw (0, util_internal_1.unexpectedCase)(prop.type.kind);
        }
    }
}
exports.ObjectCursor = ObjectCursor;
//# sourceMappingURL=cursor.js.map