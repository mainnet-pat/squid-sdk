"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db_config = void 0;
exports.isCockroach = isCockroach;
exports.withDatabase = withDatabase;
exports.databaseExecute = databaseExecute;
exports.databaseDelete = databaseDelete;
exports.useDatabase = useDatabase;
exports.useServer = useServer;
const util_internal_1 = require("@subsquid/util-internal");
const gql_test_client_1 = require("gql-test-client");
const graphql_1 = require("graphql");
const pg_1 = require("pg");
const model_schema_1 = require("../model.schema");
const server_1 = require("../server");
function isCockroach() {
    return process.env.DB_TYPE == 'cockroach';
}
exports.db_config = {
    host: 'localhost',
    port: parseInt((0, util_internal_1.assertNotNull)(isCockroach() ? process.env.DB_PORT_COCKROACH : process.env.DB_PORT_PG)),
    user: 'root',
    password: 'root',
    database: 'defaultdb'
};
async function withDatabase(block) {
    let client = new pg_1.Client(exports.db_config);
    await client.connect();
    try {
        await block(client);
    }
    finally {
        await client.end();
    }
}
function databaseExecute(sql) {
    return withDatabase(async (client) => {
        for (let i = 0; i < sql.length; i++) {
            await client.query(sql[i]);
        }
    });
}
function databaseDelete() {
    return withDatabase(async (client) => {
        await client.query(`DROP SCHEMA IF EXISTS root CASCADE`);
        await client.query(`CREATE SCHEMA root`);
    });
}
function useDatabase(sql) {
    before(async () => {
        await databaseDelete();
        await databaseExecute(sql);
    });
}
function useServer(schema, options) {
    let client = new gql_test_client_1.Client('not defined');
    let db = new pg_1.Pool(exports.db_config);
    let info;
    before(async () => {
        info = await (0, server_1.serve)({
            connection: db,
            model: (0, model_schema_1.buildModel)((0, model_schema_1.buildSchema)((0, graphql_1.parse)(schema))),
            port: 0,
            dbType: isCockroach() ? 'cockroach' : 'postgres',
            subscriptions: true,
            subscriptionPollInterval: 500,
            maxRootFields: 10,
            // log: createLogger('sqd:openreader'),
            ...options,
        });
        client.endpoint = `http://localhost:${info.port}/graphql`;
    });
    after(() => info?.close());
    after(() => db.end());
    return client;
}
//# sourceMappingURL=setup.js.map