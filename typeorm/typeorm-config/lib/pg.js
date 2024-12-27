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
exports.isPostgres = isPostgres;
exports.extractAndClearSSLParams = extractAndClearSSLParams;
exports.toPgClientConfig = toPgClientConfig;
const logger_1 = require("@subsquid/logger");
const fs = __importStar(require("fs"));
const assert_1 = __importDefault(require("assert"));
const log = (0, logger_1.createLogger)('sqd:typeorm-config');
function isPostgres(url) {
    switch (url.protocol) {
        case 'postgres:':
        case 'postgresql:':
            return true;
        default:
            return false;
    }
}
function extractAndClearSSLParams(url) {
    let ssl = {};
    let disabled = false;
    let hasMode = false;
    for (let [k, v] of Array.from(url.searchParams.entries())) {
        switch (k) {
            case 'ssl':
                switch (v) {
                    case 'true':
                    case '1':
                        break;
                    case 'false':
                    case '0':
                        disabled = true;
                        break;
                    default:
                        log.warn(`ignoring ${k}=${v}, because ${k} can only have values true, false, 1 and 0`);
                }
                url.searchParams.delete(k);
                break;
            case 'sslmode':
                switch (v) {
                    case 'disabled':
                    case 'disable':
                        disabled = true;
                        break;
                    case 'no-verify':
                        ssl.rejectUnauthorized = false;
                        break;
                    case 'prefer':
                    case 'require':
                    case 'verify-ca':
                    case 'verify-full':
                        // those are not treated specially by node-postgres
                        break;
                }
                hasMode = true;
                url.searchParams.delete(k);
                break;
            case 'sslcert':
                ssl.cert = fs.readFileSync(v, 'utf-8');
                url.searchParams.delete(k);
                break;
            case 'sslkey':
                ssl.key = fs.readFileSync(v, 'utf-8');
                url.searchParams.delete(k);
                break;
            case 'sslrootcert':
                ssl.ca = fs.readFileSync(v, 'utf-8');
                url.searchParams.delete(k);
                break;
        }
    }
    if (disabled)
        return false;
    if (hasMode || Object.keys(ssl).length > 0)
        return ssl;
}
function toPgClientConfig(con) {
    if (con.url) {
        let pg = {
            connectionString: con.url
        };
        if (con.ssl) {
            pg.ssl = con.ssl;
        }
        return pg;
    }
    else {
        (0, assert_1.default)(con.url == null);
        let { username, ...rest } = con;
        return {
            user: username,
            ...rest
        };
    }
}
//# sourceMappingURL=pg.js.map