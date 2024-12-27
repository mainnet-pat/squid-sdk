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
const util_internal_ts_node_1 = require("@subsquid/util-internal-ts-node");
const commander_1 = require("commander");
const dotenv = __importStar(require("dotenv"));
const typeorm_1 = require("typeorm");
(0, util_internal_1.runProgram)(async () => {
    commander_1.program.description('Revert the last applied migration').parse();
    dotenv.config();
    await (0, util_internal_ts_node_1.registerTsNodeIfRequired)();
    let connection = new typeorm_1.DataSource({
        ...(0, typeorm_config_1.createOrmConfig)(),
        subscribers: [],
        synchronize: false,
        migrationsRun: false,
        dropSchema: false,
        logging: ["query", "error", "schema"]
    });
    await connection.initialize();
    try {
        await connection.undoLastMigration({ transaction: 'all' });
    }
    finally {
        await connection.destroy().catch(() => null);
    }
});
//# sourceMappingURL=revert.js.map