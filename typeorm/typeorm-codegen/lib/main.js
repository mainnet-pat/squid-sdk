"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tools_1 = require("@subsquid/openreader/lib/tools");
const util_internal_1 = require("@subsquid/util-internal");
const util_internal_code_printer_1 = require("@subsquid/util-internal-code-printer");
const commander_1 = require("commander");
const fs_1 = __importDefault(require("fs"));
const codegen_1 = require("./codegen");
const fts_1 = require("./fts");
(0, util_internal_1.runProgram)(async () => {
    let program = new commander_1.Command();
    program.description(`
Generates TypeORM entity classes from squid GraphQL schema.

This tool doesn't have any option. It locates GraphQL schema according 
to squid's conventions and places the resulting models at src/model/generated
and db migrations (if any) at db/migrations. 
    `.trim());
    program.parse();
    let model = (0, tools_1.loadModel)((0, tools_1.resolveGraphqlSchema)());
    let orm = new util_internal_code_printer_1.OutDir('src/model');
    let generatedOrm = orm.child('generated');
    generatedOrm.del();
    (0, codegen_1.generateOrmModels)(model, generatedOrm);
    if (!fs_1.default.existsSync(orm.path('index.ts'))) {
        let index = orm.file('index.ts');
        index.line(`export * from "./generated/index.js"`);
        index.write();
    }
    (0, fts_1.generateFtsMigrations)(model, new util_internal_code_printer_1.OutDir('db/migrations'));
});
//# sourceMappingURL=main.js.map