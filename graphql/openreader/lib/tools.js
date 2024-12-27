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
exports.loadModel = loadModel;
exports.resolveGraphqlSchema = resolveGraphqlSchema;
const merge_1 = require("@graphql-tools/merge");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const graphql_1 = require("graphql");
const process_1 = __importDefault(require("process"));
const model_schema_1 = require("./model.schema");
function loadModel(schemaFile) {
    let files = [];
    if (fs.statSync(schemaFile).isDirectory()) {
        fs.readdirSync(schemaFile, { withFileTypes: true }).forEach(item => {
            if (item.isFile() && (item.name.endsWith('.graphql') || item.name.endsWith('.gql'))) {
                files.push(path.join(schemaFile, item.name));
            }
        });
    }
    else {
        files.push(schemaFile);
    }
    let docs = files.map(f => {
        let src = new graphql_1.Source(fs.readFileSync(f, 'utf-8'), f);
        return (0, graphql_1.parse)(src);
    });
    if (docs.length == 0)
        return {};
    let doc = docs.length == 1 ? docs[0] : (0, merge_1.mergeTypeDefs)(docs);
    let schema = (0, model_schema_1.buildSchema)(doc);
    return (0, model_schema_1.buildModel)(schema);
}
function resolveGraphqlSchema(projectDir) {
    let dir = projectDir || process_1.default.cwd();
    let loc = path.resolve(dir, 'schema.graphql');
    if (fs.existsSync(loc))
        return loc;
    loc = path.resolve(dir, 'schema');
    let stat = fs.statSync(loc, { throwIfNoEntry: false });
    if (stat?.isDirectory()) {
        let hasGraphql = fs.readdirSync(loc).some(item => item.endsWith('.graphql') || item.endsWith('.gql'));
        if (hasGraphql)
            return loc;
    }
    throw new Error(`Failed to locate schema.graphql at ${dir}`);
}
//# sourceMappingURL=tools.js.map