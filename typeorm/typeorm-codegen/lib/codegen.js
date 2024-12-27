"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOrmModels = generateOrmModels;
const util_internal_1 = require("@subsquid/util-internal");
const util_naming_1 = require("@subsquid/util-naming");
const assert_1 = __importDefault(require("assert"));
const path = __importStar(require("path"));
function generateOrmModels(model, dir) {
    const variants = collectVariants(model);
    const index = dir.file('index.ts');
    for (const name in model) {
        const item = model[name];
        switch (item.kind) {
            case 'entity':
                generateEntity(name, item);
                break;
            case 'object':
                generateObject(name, item);
                break;
            case 'union':
                generateUnion(name, item);
                break;
            case 'enum':
                generateEnum(name, item);
                break;
        }
    }
    index.write();
    dir.add('marshal.ts', path.resolve(__dirname, '../src/marshal.ts'));
    function generateEntity(name, entity) {
        index.line(`export * from "./${(0, util_naming_1.toCamelCase)(name)}.model.js"`);
        const out = dir.file(`${(0, util_naming_1.toCamelCase)(name)}.model.ts`);
        const imports = new ImportRegistry(name);
        imports.useTypeormStore('Entity', 'Column', 'PrimaryColumn');
        out.lazy(() => imports.render(model, out));
        out.line();
        printComment(entity, out);
        entity.indexes?.forEach(index => {
            if (index.fields.length < 2)
                return;
            imports.useTypeormStore('Index');
            out.line(`@Index_([${index.fields.map(f => `"${f.name}"`).join(', ')}], {unique: ${!!index.unique}})`);
        });
        out.line('@Entity_()');
        out.block(`export class ${name}`, () => {
            out.block(`constructor(props?: Partial<${name}>)`, () => {
                out.line('Object.assign(this, props)');
            });
            for (const key in entity.properties) {
                const prop = entity.properties[key];
                importReferencedModel(imports, prop);
                out.line();
                printComment(prop, out);
                switch (prop.type.kind) {
                    case 'scalar':
                        if (key === 'id') {
                            out.line('@PrimaryColumn_()');
                        }
                        else {
                            const decorator = getDecorator(prop.type.name);
                            imports.useTypeormStore(decorator);
                            addIndexAnnotation(entity, key, imports, out);
                            out.line(`@${decorator}_({nullable: ${prop.nullable}})`);
                        }
                        break;
                    case 'enum':
                        addIndexAnnotation(entity, key, imports, out);
                        out.line(`@Column_("varchar", {length: ${getEnumMaxLength(model, prop.type.name)}, nullable: ${prop.nullable}})`);
                        break;
                    case 'fk':
                        if (getFieldIndex(entity, key)?.unique) {
                            imports.useTypeormStore('OneToOne', 'Index', 'JoinColumn');
                            out.line(`@Index_({unique: true})`);
                            out.line(`@OneToOne_('${prop.type.entity}', {nullable: true})`);
                            out.line(`@JoinColumn_()`);
                        }
                        else {
                            imports.useTypeormStore('ManyToOne', 'Index');
                            if (!entity.indexes?.some(index => index.fields[0]?.name == key && index.fields.length > 1)) {
                                out.line(`@Index_()`);
                            }
                            // Make foreign entity references always nullable
                            out.line(`@ManyToOne_('${prop.type.entity}', {nullable: true})`);
                        }
                        break;
                    case 'lookup':
                        imports.useTypeormStore('OneToOne');
                        out.line(`@OneToOne_('${prop.type.entity}', '${prop.type.field}')`);
                        break;
                    case 'list-lookup':
                        imports.useTypeormStore('OneToMany');
                        out.line(`@OneToMany_('${prop.type.entity}', '${prop.type.field}')`);
                        break;
                    case 'object':
                    case 'union':
                        imports.useMarshal();
                        out.line(`@Column_("jsonb", {transformer: {to: obj => ${marshalToJson(prop, 'obj')}, from: obj => ${marshalFromJson({ ...prop, nullable: true }, 'obj')}}, nullable: ${prop.nullable}})`);
                        break;
                    case 'list':
                        switch (prop.type.item.type.kind) {
                            case 'scalar': {
                                let scalar = prop.type.item.type.name;
                                if (scalar == 'BigInt' || scalar == 'BigDecimal') {
                                    throw new Error(`Property ${name}.${key} has unsupported type: can't generate code for native ${scalar} arrays.`);
                                }
                                const decorator = getDecorator(scalar);
                                imports.useTypeormStore(decorator);
                                out.line(`@${decorator}_({array: true, nullable: ${prop.nullable}})`);
                                break;
                            }
                            case 'enum':
                                out.line(`@Column_("varchar", {length: ${getEnumMaxLength(model, prop.type.item.type.name)}, array: true, nullable: ${prop.nullable}})`);
                                break;
                            case 'object':
                            case 'union':
                            case 'list':
                                imports.useMarshal();
                                out.line(`@Column_("jsonb", {transformer: {to: obj => ${marshalToJson(prop, 'obj')}, from: obj => ${marshalFromJson({ ...prop, nullable: true }, 'obj')}}, nullable: ${prop.nullable}})`);
                                break;
                            default:
                                throw (0, util_internal_1.unexpectedCase)(prop.type.item.type.kind);
                        }
                        break;
                    default:
                        throw (0, util_internal_1.unexpectedCase)(prop.type.kind);
                }
                out.line(`${key}!: ${getPropJsType(imports, 'entity', prop)}`);
            }
        });
        out.write();
    }
    function getDecorator(scalar) {
        switch (scalar) {
            case 'ID':
            case 'String':
                return 'StringColumn';
            case 'Int':
                return 'IntColumn';
            case 'Float':
                return 'FloatColumn';
            case 'Boolean':
                return 'BooleanColumn';
            case 'DateTime':
                return 'DateTimeColumn';
            case 'BigInt':
                return 'BigIntColumn';
            case 'BigDecimal':
                return 'BigDecimalColumn';
            case 'Bytes':
                return 'BytesColumn';
            case 'JSON':
                return 'JSONColumn';
            default:
                throw (0, util_internal_1.unexpectedCase)(scalar);
        }
    }
    function generateObject(name, object) {
        index.line(`export * from "./_${(0, util_naming_1.toCamelCase)(name)}.js"`);
        const out = dir.file(`_${(0, util_naming_1.toCamelCase)(name)}.ts`);
        const imports = new ImportRegistry(name);
        imports.useMarshal();
        imports.useAssert();
        out.lazy(() => imports.render(model, out));
        out.line();
        printComment(object, out);
        out.block(`export class ${name}`, () => {
            if (variants.has(name)) {
                out.line(`public readonly isTypeOf = '${name}'`);
            }
            for (const key in object.properties) {
                const prop = object.properties[key];
                importReferencedModel(imports, prop);
                out.line(`private _${key}!: ${getPropJsType(imports, 'object', prop)}`);
            }
            out.line();
            out.block(`constructor(props?: Partial<Omit<${name}, 'toJSON'>>, json?: any)`, () => {
                out.line('Object.assign(this, props)');
                out.block(`if (json != null)`, () => {
                    for (const key in object.properties) {
                        const prop = object.properties[key];
                        out.line(`this._${key} = ${marshalFromJson(prop, 'json.' + key)}`);
                    }
                });
            });
            for (const key in object.properties) {
                const prop = object.properties[key];
                out.line();
                printComment(prop, out);
                out.block(`get ${key}(): ${getPropJsType(imports, 'object', prop)}`, () => {
                    if (!prop.nullable) {
                        out.line(`assert(this._${key} != null, 'uninitialized access')`);
                    }
                    out.line(`return this._${key}`);
                });
                out.line();
                out.block(`set ${key}(value: ${getPropJsType(imports, 'object', prop)})`, () => {
                    out.line(`this._${key} = value`);
                });
            }
            out.line();
            out.block(`toJSON(): object`, () => {
                out.block('return', () => {
                    if (variants.has(name)) {
                        out.line('isTypeOf: this.isTypeOf,');
                    }
                    for (const key in object.properties) {
                        const prop = object.properties[key];
                        out.line(`${key}: ${marshalToJson(prop, 'this.' + key)},`);
                    }
                });
            });
        });
        out.write();
    }
    function importReferencedModel(imports, prop) {
        switch (prop.type.kind) {
            case 'enum':
            case 'object':
            case 'union':
                imports.useModel(prop.type.name);
                break;
            case 'fk':
            case 'lookup':
            case 'list-lookup':
                imports.useModel(prop.type.entity);
                break;
            case 'list':
                importReferencedModel(imports, prop.type.item);
                break;
        }
    }
    function marshalFromJson(prop, exp) {
        // assumes exp is a pure variable or prop access
        let convert;
        switch (prop.type.kind) {
            case 'scalar':
                if (prop.type.name == 'JSON')
                    return exp;
                convert = `marshal.${prop.type.name.toLowerCase()}.fromJSON(${exp})`;
                break;
            case 'enum':
                convert = `marshal.enumFromJson(${exp}, ${prop.type.name})`;
                break;
            case 'fk':
                convert = `marshal.string.fromJSON(${exp})`;
                break;
            case 'object':
                convert = `new ${prop.type.name}(undefined, ${prop.nullable ? exp : `marshal.nonNull(${exp})`})`;
                break;
            case 'union':
                convert = `fromJson${prop.type.name}(${exp})`;
                break;
            case 'list':
                convert = `marshal.fromList(${exp}, val => ${marshalFromJson(prop.type.item, 'val')})`;
                break;
            default:
                throw (0, util_internal_1.unexpectedCase)(prop.type.kind);
        }
        if (prop.nullable) {
            convert = `${exp} == null ? undefined : ${convert}`;
        }
        return convert;
    }
    function marshalToJson(prop, exp) {
        // assumes exp is a pure variable or prop access
        let convert;
        switch (prop.type.kind) {
            case 'scalar':
                switch (prop.type.name) {
                    case 'ID':
                    case 'String':
                    case 'Boolean':
                    case 'Int':
                    case 'Float':
                    case 'JSON':
                        return exp;
                    default:
                        convert = `marshal.${prop.type.name.toLowerCase()}.toJSON(${exp})`;
                }
                break;
            case 'enum':
            case 'fk':
                return exp;
            case 'object':
            case 'union':
                convert = exp + '.toJSON()';
                break;
            case 'list': {
                let marshal = marshalToJson(prop.type.item, 'val');
                if (marshal == 'val')
                    return exp;
                convert = `${exp}.map((val: any) => ${marshal})`;
                break;
            }
            default:
                throw (0, util_internal_1.unexpectedCase)(prop.type.kind);
        }
        if (prop.nullable) {
            convert = `${exp} == null ? undefined : ${convert}`;
        }
        return convert;
    }
    function generateUnion(name, union) {
        index.line(`export * from "./_${(0, util_naming_1.toCamelCase)(name)}.js"`);
        const out = dir.file(`_${(0, util_naming_1.toCamelCase)(name)}.ts`);
        const imports = new ImportRegistry(name);
        out.lazy(() => imports.render(model, out));
        union.variants.forEach((v) => imports.useModel(v));
        out.line();
        out.line(`export type ${name} = ${union.variants.join(' | ')}`);
        out.line();
        out.block(`export function fromJson${name}(json: any): ${name}`, () => {
            out.block(`switch(json?.isTypeOf)`, () => {
                union.variants.forEach((v) => {
                    out.line(`case '${v}': return new ${v}(undefined, json)`);
                });
                out.line(`default: throw new TypeError('Unknown json object passed as ${name}')`);
            });
        });
        out.write();
    }
    function generateEnum(name, e) {
        index.line(`export * from "./_${(0, util_naming_1.toCamelCase)(name)}.js"`);
        const out = dir.file(`_${(0, util_naming_1.toCamelCase)(name)}.ts`);
        out.block(`export enum ${name}`, () => {
            for (const val in e.values) {
                out.line(`${val} = "${val}",`);
            }
        });
        out.write();
    }
}
function getPropJsType(imports, owner, prop) {
    let type;
    switch (prop.type.kind) {
        case 'scalar':
            type = getScalarJsType(prop.type.name);
            if (type == 'BigDecimal') {
                imports.useBigDecimal();
            }
            break;
        case 'enum':
        case 'object':
        case 'union':
            type = prop.type.name;
            break;
        case 'fk':
            if (owner === 'entity') {
                type = prop.type.entity;
            }
            else {
                type = 'string';
            }
            break;
        case 'lookup':
            type = prop.type.entity;
            break;
        case 'list-lookup':
            type = prop.type.entity + '[]';
            break;
        case 'list':
            type = getPropJsType(imports, 'object', prop.type.item);
            if (type.indexOf('|')) {
                type = `(${type})[]`;
            }
            else {
                type += '[]';
            }
            break;
        default:
            throw (0, util_internal_1.unexpectedCase)(prop.type.kind);
    }
    if (prop.nullable) {
        type += ' | undefined | null';
    }
    return type;
}
function getScalarJsType(typeName) {
    switch (typeName) {
        case 'ID':
        case 'String':
            return 'string';
        case 'Int':
        case 'Float':
            return 'number';
        case 'Boolean':
            return 'boolean';
        case 'DateTime':
            return 'Date';
        case 'BigInt':
            return 'bigint';
        case 'BigDecimal':
            return 'BigDecimal';
        case 'Bytes':
            return 'Uint8Array';
        case 'JSON':
            return 'unknown';
        default:
            throw (0, util_internal_1.unexpectedCase)(typeName);
    }
}
function getEnumMaxLength(model, enumName) {
    const e = model[enumName];
    (0, assert_1.default)(e.kind === 'enum');
    return Object.keys(e.values).reduce((max, v) => Math.max(max, v.length), 0);
}
function collectVariants(model) {
    const variants = new Set();
    for (const name in model) {
        const item = model[name];
        if (item.kind === 'union') {
            item.variants.forEach((v) => variants.add(v));
        }
    }
    return variants;
}
function addIndexAnnotation(entity, field, imports, out) {
    let index = getFieldIndex(entity, field);
    if (index == null)
        return;
    imports.useTypeormStore('Index');
    if (index.unique) {
        out.line(`@Index_({unique: true})`);
    }
    else {
        out.line(`@Index_()`);
    }
}
function getFieldIndex(entity, field) {
    if (entity.properties[field]?.unique)
        return { unique: true };
    let candidates = entity.indexes?.filter(index => index.fields[0]?.name == field) || [];
    if (candidates.length == 0)
        return undefined;
    if (candidates.find(index => index.fields.length == 1 && index.unique))
        return { unique: true };
    if (candidates.some(index => index.fields.length > 1))
        return undefined;
    return candidates[0];
}
function printComment(obj, out) {
    if (obj.description) {
        const lines = obj.description.split('\n');
        out.blockComment(lines);
    }
}
class ImportRegistry {
    constructor(owner) {
        this.owner = owner;
        this.typeorm = new Set();
        this.model = new Set();
        this.marshal = false;
        this.bigdecimal = false;
        this.assert = false;
    }
    useTypeormStore(...names) {
        names.forEach((name) => this.typeorm.add(name));
    }
    useModel(...names) {
        names.forEach((name) => {
            if (name == this.owner)
                return;
            this.model.add(name);
        });
    }
    useMarshal() {
        this.marshal = true;
    }
    useBigDecimal() {
        this.bigdecimal = true;
    }
    useAssert() {
        this.assert = true;
    }
    render(model, out) {
        if (this.bigdecimal) {
            out.line(`import {BigDecimal} from "@subsquid/big-decimal"`);
        }
        if (this.assert) {
            out.line('import assert from "assert"');
        }
        if (this.typeorm.size > 0) {
            const importList = Array.from(this.typeorm).map((name) => name + ' as ' + name + '_');
            out.line(`import {${importList.join(', ')}} from "@subsquid/typeorm-store"`);
        }
        if (this.marshal) {
            out.line(`import * as marshal from "./marshal.js"`);
        }
        for (const name of this.model) {
            switch (model[name].kind) {
                case 'entity':
                    out.line(`import {type ${name}} from "./${(0, util_naming_1.toCamelCase)(name)}.model.js"`);
                    break;
                default: {
                    const names = [name];
                    if (model[name].kind === 'union') {
                        names.push('fromJson' + name);
                    }
                    out.line(`import {type ${names.join(', ')}} from "./_${(0, util_naming_1.toCamelCase)(name)}.js"`);
                }
            }
        }
    }
}
//# sourceMappingURL=codegen.js.map