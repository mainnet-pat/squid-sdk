"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AliasSet = exports.JoinSet = exports.ColumnSet = void 0;
exports.escapeIdentifier = escapeIdentifier;
exports.printClause = printClause;
function escapeIdentifier(dialect, name) {
    return `"${name.replace(/"/g, '""')}"`;
}
class ColumnSet {
    constructor() {
        this.columns = new Map();
    }
    add(column) {
        let idx = this.columns.get(column);
        if (idx == null) {
            idx = this.columns.size;
            this.columns.set(column, idx);
        }
        return idx;
    }
    names() {
        return [...this.columns.keys()];
    }
    size() {
        return this.columns.size;
    }
}
exports.ColumnSet = ColumnSet;
class JoinSet {
    constructor(aliases) {
        this.aliases = aliases;
        this.joins = new Map();
    }
    add(table, column, rhs) {
        let key = `${table} ${column} ${rhs}`;
        let e = this.joins.get(key);
        if (!e) {
            e = {
                table,
                alias: this.aliases.add(table),
                column,
                rhs
            };
            this.joins.set(key, e);
        }
        return e.alias;
    }
    forEach(cb) {
        this.joins.forEach(join => cb(join));
    }
}
exports.JoinSet = JoinSet;
class AliasSet {
    constructor() {
        this.aliases = {};
    }
    add(name) {
        if (this.aliases[name]) {
            return name + "_" + (this.aliases[name]++);
        }
        else {
            this.aliases[name] = 1;
            return name;
        }
    }
}
exports.AliasSet = AliasSet;
function printClause(op, exps) {
    switch (exps.length) {
        case 0: return '';
        case 1: return exps[0];
        default: return exps.join(' ' + op + ' ');
    }
}
//# sourceMappingURL=util.js.map