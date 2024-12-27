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
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_config_1 = require("@subsquid/typeorm-config");
const util_internal_1 = require("@subsquid/util-internal");
const util_internal_code_printer_1 = require("@subsquid/util-internal-code-printer");
const util_internal_ts_node_1 = require("@subsquid/util-internal-ts-node");
const commander_1 = require("commander");
const dotenv = __importStar(require("dotenv"));
const typeorm_1 = require("typeorm");
(0, util_internal_1.runProgram)(async () => {
    commander_1.program.description('Analyze the current database state and generate migration to match the target schema');
    commander_1.program.option('-n, --name <name>', 'name suffix for new migration', 'Data');
    commander_1.program.option('--esm', 'generate esm module', false);
    let { name } = commander_1.program.parse().opts();
    let { esm } = commander_1.program.parse().opts();
    dotenv.config();
    await (0, util_internal_ts_node_1.registerTsNodeIfRequired)();
    let connection = new typeorm_1.DataSource({
        ...(0, typeorm_config_1.createOrmConfig)(),
        synchronize: false,
        migrationsRun: false,
        dropSchema: false,
        logging: false
    });
    await connection.initialize();
    let commands;
    try {
        commands = await connection.driver.createSchemaBuilder().log();
    }
    finally {
        await connection.destroy().catch(() => null);
    }
    if (commands.upQueries.length == 0) {
        console.error('No changes in database schema were found - cannot generate a migration.');
        process.exit(1);
    }
    let dir = new util_internal_code_printer_1.OutDir(typeorm_config_1.MIGRATIONS_DIR);
    let timestamp = Date.now();
    let out = dir.file(`${timestamp}-${name}.${!esm ? 'js' : 'cjs'}`);
    out.block(`module.exports = class ${name}${timestamp}`, () => {
        out.line(`name = '${name}${timestamp}'`);
        out.line();
        out.block(`async up(db)`, () => {
            commands.upQueries.forEach(q => {
                out.line(`await db.query${queryTuple(q)}`);
            });
        });
        out.line();
        out.block(`async down(db)`, () => {
            commands.downQueries.forEach(q => {
                out.line(`await db.query${queryTuple(q)}`);
            });
        });
    });
    out.write();
});
function queryTuple(q) {
    let params = q.parameters?.length ? ', ' + JSON.stringify(q.parameters) : '';
    return '(`' + q.query + '`' + params + ')';
}
//# sourceMappingURL=generate.js.map