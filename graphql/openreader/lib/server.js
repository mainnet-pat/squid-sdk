"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serve = serve;
exports.runApollo = runApollo;
exports.addServerCleanup = addServerCleanup;
exports.setupGraphiqlConsole = setupGraphiqlConsole;
const util_internal_http_server_1 = require("@subsquid/util-internal-http-server");
const apollo_server_express_1 = require("apollo-server-express");
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const ws_1 = require("graphql-ws/lib/use/ws");
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const ws_2 = require("ws");
const db_1 = require("./db");
const execute_1 = require("./util/execute");
const limit_1 = require("./util/limit");
const dialect_1 = require("./dialect");
async function serve(options) {
    let { connection, subscriptionConnection, subscriptionPollInterval, maxResponseNodes, subscriptionMaxResponseNodes, log, } = options;
    let dbType = options.dbType ?? 'postgres';
    let schemaBuilder = await (0, dialect_1.getSchemaBuilder)(options);
    let schema = schemaBuilder.build();
    let context = () => {
        let openreader = new db_1.PoolOpenreaderContext(dbType, connection, subscriptionConnection, subscriptionPollInterval, log);
        if (maxResponseNodes) {
            openreader.responseSizeLimit = new limit_1.ResponseSizeLimit(maxResponseNodes);
            openreader.subscriptionResponseSizeLimit = new limit_1.ResponseSizeLimit(maxResponseNodes);
        }
        if (subscriptionMaxResponseNodes) {
            openreader.subscriptionResponseSizeLimit = new limit_1.ResponseSizeLimit(subscriptionMaxResponseNodes);
        }
        return {
            openreader,
        };
    };
    let disposals = [];
    return addServerCleanup(disposals, runApollo({
        port: options.port,
        schema,
        context,
        disposals,
        subscriptions: options.subscriptions,
        log: options.log,
        graphiqlConsole: options.graphiqlConsole,
        maxRequestSizeBytes: options.maxRequestSizeBytes,
        maxRootFields: options.maxRootFields,
        cache: options.cache,
    }), options.log);
}
async function runApollo(options) {
    const { disposals, context, schema, log, maxRootFields } = options;
    let maxRequestSizeBytes = options.maxRequestSizeBytes ?? 256 * 1024;
    let app = (0, express_1.default)();
    let server = http_1.default.createServer(app);
    let execute = (args) => (0, execute_1.openreaderExecute)(args, {
        maxRootFields: maxRootFields
    });
    if (options.subscriptions) {
        let wsServer = new ws_2.WebSocketServer({
            server,
            path: '/graphql',
            maxPayload: maxRequestSizeBytes
        });
        let wsServerCleanup = (0, ws_1.useServer)({
            schema,
            context,
            execute,
            subscribe: execute_1.openreaderSubscribe,
            onNext(_ctx, _message, args, result) {
                args.contextValue.openreader.close();
                return result;
            }
        }, wsServer);
        disposals.push(async () => wsServerCleanup.dispose());
    }
    let apollo = new apollo_server_express_1.ApolloServer({
        schema,
        context,
        cache: options.cache,
        stopOnTerminationSignals: false,
        allowBatchedHttpRequests: false,
        executor: async (req) => {
            return execute({
                schema,
                document: req.document,
                rootValue: {},
                contextValue: req.context,
                variableValues: req.request.variables,
                operationName: req.operationName
            });
        },
        plugins: [
            ...options.plugins || [],
            {
                async requestDidStart() {
                    return {
                        willSendResponse(req) {
                            return req.context.openreader.close();
                        }
                    };
                }
            },
        ]
    });
    if (options.graphiqlConsole !== false) {
        setupGraphiqlConsole(app);
    }
    await apollo.start();
    disposals.push(() => apollo.stop());
    apollo.applyMiddleware({
        app: app, // @types/express version mismatch. We don't want to pin it just because of this line.
        bodyParserConfig: {
            limit: maxRequestSizeBytes
        }
    });
    return (0, util_internal_http_server_1.listen)(server, options.port);
}
function addServerCleanup(disposals, server, log) {
    async function cleanup() {
        for (let i = disposals.length - 1; i >= 0; i--) {
            await disposals[i]().catch(err => log?.error(err));
        }
    }
    return server.then(s => {
        return {
            port: s.port,
            close: () => s.close().finally(cleanup)
        };
    }, async (err) => {
        await cleanup();
        throw err;
    });
}
function setupGraphiqlConsole(app) {
    let assets = path_1.default.join(require.resolve('@subsquid/graphiql-console/package.json'), '../build');
    let indexHtml = fs_1.default.readFileSync(path_1.default.join(assets, 'index.html'), 'utf-8')
        .replace(/\/static\//g, 'console/static/')
        .replace('/manifest.json', 'console/manifest.json')
        .replace('${GRAPHQL_API}', 'graphql')
        .replace('${APP_TITLE}', 'Query node playground');
    app.use('/console', express_1.default.static(assets));
    app.use('/graphql', (req, res, next) => {
        if (req.path != '/')
            return next();
        if (req.method != 'GET' && req.method != 'HEAD')
            return next();
        if (req.query['query'])
            return next();
        res.vary('Accept');
        if (!req.accepts('html'))
            return next();
        res.type('html').send(indexHtml);
    });
}
//# sourceMappingURL=server.js.map