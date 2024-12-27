"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("@subsquid/logger");
const util_internal_1 = require("@subsquid/util-internal");
const util_internal_commander_1 = require("@subsquid/util-internal-commander");
const util_internal_http_server_1 = require("@subsquid/util-internal-http-server");
const commander_1 = require("commander");
const pg_1 = require("pg");
const server_1 = require("./server");
const tools_1 = require("./tools");
const LOG = (0, logger_1.createLogger)('sqd:openreader');
(0, util_internal_1.runProgram)(async () => {
    let program = new commander_1.Command();
    program.description(`
GraphQL server for postgres-compatible databases
    `.trim());
    program.requiredOption('-s, --schema <file>', 'a path to a file or folder with database description');
    program.requiredOption('-d, --db-url <url>', 'database connection string', (0, util_internal_commander_1.Url)(['postgres:']));
    program.addOption(new commander_1.Option('-t, --db-type <type>', 'database type').choices(['postgres', 'cockroach']).default('postgres'));
    program.option('-p, --port <number>', 'port to listen on', util_internal_commander_1.nat, 3000);
    program.option('--max-request-size <kb>', 'max request size in kilobytes', util_internal_commander_1.nat, 256);
    program.option('--max-root-fields <count>', 'max number of root fields in a query', util_internal_commander_1.nat);
    program.option('--max-response-size <nodes>', 'max response size measured in nodes', util_internal_commander_1.nat);
    program.option('--sql-statement-timeout <ms>', 'sql statement timeout in ms', util_internal_commander_1.nat);
    program.option('--subscriptions', 'enable gql subscriptions');
    program.option('--subscription-poll-interval <ms>', 'subscription poll interval in ms', util_internal_commander_1.nat, 1000);
    program.option('--subscription-max-response-size <nodes>', 'max response size measured in nodes', util_internal_commander_1.nat);
    let opts = program.parse().opts();
    let model = (0, tools_1.loadModel)(opts.schema);
    let connection = new pg_1.Pool({
        connectionString: opts.dbUrl,
        statement_timeout: opts.sqlStatementTimeout || undefined
    });
    let server = await (0, server_1.serve)({
        model,
        dbType: opts.dbType,
        connection,
        port: opts.port,
        log: LOG,
        maxRequestSizeBytes: opts.maxRequestSize * 1024,
        maxRootFields: opts.maxRootFields,
        maxResponseNodes: opts.maxResponseSize,
        subscriptions: opts.subscriptions,
        subscriptionPollInterval: opts.subscriptionPollInterval,
        subscriptionMaxResponseNodes: opts.subscriptionMaxResponseSize
    });
    LOG.info(`listening on port ${server.port}`);
    return (0, util_internal_http_server_1.waitForInterruption)(server);
}, err => LOG.fatal(err));
//# sourceMappingURL=main.js.map