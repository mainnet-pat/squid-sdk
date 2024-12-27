"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_config_1 = require("@subsquid/typeorm-config");
const util_internal_1 = require("@subsquid/util-internal");
const util_internal_code_printer_1 = require("@subsquid/util-internal-code-printer");
const commander_1 = require("commander");
(0, util_internal_1.runProgram)(async () => {
    commander_1.program.description('Create template file for a new migration');
    commander_1.program.option('--name', 'name suffix for new migration', 'Data');
    commander_1.program.option('--esm', 'generate esm module', false);
    let { name } = commander_1.program.parse().opts();
    let { esm } = commander_1.program.parse().opts();
    let dir = new util_internal_code_printer_1.OutDir(typeorm_config_1.MIGRATIONS_DIR);
    let timestamp = Date.now();
    let out = dir.file(`${timestamp}-${name}.${!esm ? 'js' : 'cjs'}`);
    out.block(`module.exports = class ${name}${timestamp}`, () => {
        out.line(`name = '${name}${timestamp}'`);
        out.line();
        out.block(`async up(db)`, () => {
            out.line();
        });
        out.line();
        out.block(`async down(db)`, () => {
            out.line();
        });
    });
    out.write();
});
//# sourceMappingURL=create.js.map