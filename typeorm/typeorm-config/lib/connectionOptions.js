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
exports.createConnectionOptions = createConnectionOptions;
const logger_1 = require("@subsquid/logger");
const assert_1 = __importDefault(require("assert"));
const fs = __importStar(require("fs"));
const process_1 = __importDefault(require("process"));
const pg_1 = require("./pg");
const log = (0, logger_1.createLogger)('sqd:typeorm-config');
function createConnectionOptions() {
    let con;
    if (process_1.default.env.DB_URL) {
        log.debug('using connection string from DB_URL');
        let url = new URL(process_1.default.env.DB_URL);
        if (!(0, pg_1.isPostgres)(url)) {
            throw new Error('Only postgres:// or postgresql:// protocols are supported');
        }
        if (process_1.default.env.DB_HOST) {
            log.warn('ignoring DB_HOST, because DB_URL is set');
        }
        if (process_1.default.env.DB_PORT) {
            log.warn('ignoring DB_PORT, because DB_URL is set');
        }
        if (process_1.default.env.DB_USER) {
            if (url.username) {
                log.warn('ignoring DB_USER, because DB_URL is set');
            }
            else {
                log.debug('setting username from DB_USER');
                url.username = process_1.default.env.DB_USER;
            }
        }
        if (process_1.default.env.DB_PASS) {
            if (url.password) {
                log.warn('ignoring DB_PASS, because DB_URL is set');
            }
            else {
                log.debug('setting password from DB_PASS');
                url.password = process_1.default.env.DB_PASS;
            }
        }
        if (process_1.default.env.DB_NAME) {
            log.warn(`ignoring DB_NAME, because DB_URL is set`);
        }
        let ssl;
        if ((0, pg_1.isPostgres)(url)) {
            ssl = (0, pg_1.extractAndClearSSLParams)(url);
        }
        con = {
            url: url.toString()
        };
        if (ssl != null) {
            con.ssl = ssl;
        }
    }
    else {
        let host = 'localhost';
        let port = 5432;
        let database = 'postgres';
        let username = 'postgres';
        let password = 'postgres';
        if (process_1.default.env.DB_HOST) {
            log.debug('setting host from DB_HOST');
            host = process_1.default.env.DB_HOST;
        }
        if (process_1.default.env.DB_PORT) {
            log.debug('setting port from DB_PORT');
            port = parseInt(process_1.default.env.DB_PORT);
            (0, assert_1.default)(Number.isSafeInteger(port), 'invalid port number in DB_PORT env var');
        }
        if (process_1.default.env.DB_NAME) {
            log.debug('setting database name from DB_NAME');
            database = process_1.default.env.DB_NAME;
        }
        if (process_1.default.env.DB_USER) {
            log.debug('setting username from DB_USER');
            username = process_1.default.env.DB_USER;
        }
        if (process_1.default.env.DB_PASS) {
            log.debug('setting password from DB_PASS');
            password = process_1.default.env.DB_PASS;
        }
        con = {
            host,
            port,
            database,
            username,
            password
        };
    }
    if (con.ssl != null && process_1.default.env.DB_SSL) {
        log.warn('ignoring DB_SSL, because SSL settings where provided in DB_URL');
    }
    else if (con.ssl || (con.ssl == null && getDbSsl())) {
        let ssl = con.ssl || (con.ssl = {});
        if (process_1.default.env.DB_SSL_CA) {
            if (ssl.ca) {
                log.warn('ignoring DB_SSL_CA, because CA was set in DB_URL');
            }
            else {
                log.debug('setting CA from DB_SSL_CA');
                ssl.ca = process_1.default.env.DB_SSL_CA;
            }
        }
        if (process_1.default.env.DB_SSL_CA_FILE) {
            if (ssl.ca) {
                let reason = process_1.default.env.DB_SSL_CA ? 'DB_SSL_CA is set' : 'CA was set in DB_URL';
                log.warn(`ignoring DB_SSL_CA_FILE, because ${reason}`);
            }
            else {
                log.debug(`setting CA from ${process_1.default.env.DB_SSL_CA_FILE}`);
                ssl.ca = fs.readFileSync(process_1.default.env.DB_SSL_CA_FILE, 'utf-8');
            }
        }
        if (process_1.default.env.DB_SSL_CERT) {
            if (ssl.cert) {
                log.warn('ignoring DB_SSL_CERT, because SSL certificate was set in DB_URL');
            }
            else {
                log.debug('setting client cert from DB_SSL_CERT');
                ssl.cert = process_1.default.env.DB_SSL_CERT;
            }
        }
        if (process_1.default.env.DB_SSL_CERT_FILE) {
            if (ssl.cert) {
                let reason = process_1.default.env.DB_SSL_CERT ? 'DB_SSL_CERT is set' : 'SSL certificate was set in DB_URL';
                log.warn(`ignoring DB_SSL_CERT_FILE, because ${reason}`);
            }
            else {
                log.debug(`setting client cert from ${process_1.default.env.DB_SSL_CERT_FILE}`);
                ssl.cert = fs.readFileSync(process_1.default.env.DB_SSL_CERT_FILE, 'utf-8');
            }
        }
        if (process_1.default.env.DB_SSL_KEY) {
            if (ssl.key) {
                log.warn('ignoring DB_SSL_KEY, because SSL key was set in DB_URL');
            }
            else {
                log.debug('setting client private key from DB_SSL_KEY');
                ssl.key = process_1.default.env.DB_SSL_KEY;
            }
        }
        if (process_1.default.env.DB_SSL_KEY_FILE) {
            if (ssl.key) {
                let reason = process_1.default.env.DB_SSL_KEY ? 'DB_SSL_KEY is set' : 'SSL key was set in DB_URL';
                log.warn(`ignoring DB_SSL_KEY_FILE, because ${reason}`);
            }
            else {
                log.debug(`setting client private key from ${process_1.default.env.DB_SSL_KEY_FILE}`);
                ssl.key = fs.readFileSync(process_1.default.env.DB_SSL_KEY_FILE, 'utf-8');
            }
        }
        if (process_1.default.env.DB_SSL_REJECT_UNAUTHORIZED === 'false') {
            log.warn('DB_SSL_REJECT_UNAUTHORIZED was set to false, server authorization errors will be ignored');
            ssl.rejectUnauthorized = false;
        }
    }
    if (log.isDebug()) {
        log.debug(getDebugProps(con), 'gathered connection parameters');
    }
    return con;
}
function getDbSsl() {
    if (!process_1.default.env.DB_SSL)
        return false;
    switch (process_1.default.env.DB_SSL) {
        case 'true':
            return true;
        case 'false':
            return false;
        default:
            log.warn(`ignoring DB_SSL env var as it has unrecognized value "${process_1.default.env.DB_SSL}". ` +
                `Only allowed values are "true" and "false"`);
            return false;
    }
}
function getDebugProps(con) {
    let { ssl, ...params } = con;
    let info = {};
    if (params.url) {
        let url = new URL(params.url);
        if (url.password) {
            url.password = '***';
        }
        info.url = url.toString();
    }
    else {
        Object.assign(info, params);
        if (info.password) {
            info.password = '***';
        }
    }
    if (ssl) {
        info.sslEnabled = true;
        info.sslCa = ssl.ca;
        info.sslCert = ssl.cert;
        if (ssl.key) {
            info.sslPrivateKey = '***';
        }
        if (ssl.rejectUnauthorized === false) {
            info.sslRejectUnauthorized = false;
        }
    }
    else if (ssl === false) {
        info.sslEnabled = false;
    }
    return info;
}
//# sourceMappingURL=connectionOptions.js.map