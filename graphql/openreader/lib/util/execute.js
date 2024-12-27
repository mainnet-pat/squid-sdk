"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openreaderExecute = openreaderExecute;
exports.openreaderSubscribe = openreaderSubscribe;
const logger_1 = require("@subsquid/logger");
const util_internal_1 = require("@subsquid/util-internal");
const apollo_server_core_1 = require("apollo-server-core");
const graphql_1 = require("graphql");
const execute_1 = require("graphql/execution/execute");
const error_handling_1 = require("./error-handling");
async function openreaderExecute(args, options) {
    let log = args.contextValue.openreader.log?.child('gql');
    if (log?.isDebug()) {
        log.debug((0, error_handling_1.getDocumentCtx)(args), 'graphql query');
    }
    let result;
    let errors = validate(args, options);
    if (errors.length > 0) {
        result = { errors };
    }
    else {
        result = await (0, execute_1.execute)(args);
    }
    logResult('graphql result', log, args, result);
    return result;
}
async function openreaderSubscribe(args) {
    let log = args.contextValue.openreader.log?.child('gql');
    if (log?.isDebug()) {
        log.debug((0, error_handling_1.getDocumentCtx)(args), 'graphql subscription');
    }
    let result;
    let errors = validate(args, {});
    if (errors.length > 0) {
        result = { errors };
    }
    else {
        result = await (0, graphql_1.subscribe)(args);
    }
    if (result[Symbol.asyncIterator]) {
        log?.debug('graphql subscription initiated');
        if (log)
            return logSubscriptionResults(log, args, result);
    }
    else {
        logResult('graphql subscription result', log, args, result);
    }
    return result;
}
async function* logSubscriptionResults(log, args, results) {
    for await (let result of results) {
        logResult('graphql subscription result', log, args, result);
        yield result;
    }
    log.debug('graphql subscription ended');
}
function logResult(msg, log, args, result) {
    if (log == null)
        return;
    if (log.isDebug()) {
        log.debug({
            graphqlResult: log.isTrace() ? result : undefined
        }, msg);
    }
    (0, error_handling_1.logGraphQLErrors)(log, args, result.errors);
}
function validate(args, { maxRootFields }) {
    (0, execute_1.assertValidExecutionArguments)(args.schema, args.document, args.variableValues);
    let xtx = (0, execute_1.buildExecutionContext)(args.schema, args.document, args.rootValue, args.contextValue, args.variableValues, args.operationName, args.fieldResolver, args.typeResolver);
    if (Array.isArray(xtx))
        return xtx.map(err => (0, util_internal_1.addErrorContext)(err, {
            __openreaderLogLevel: logger_1.LogLevel.WARN
        }));
    let etx = xtx;
    if (maxRootFields && etx.operation.operation == 'query') {
        let query = (0, graphql_1.getOperationRootType)(etx.schema, etx.operation);
        let fields = (0, execute_1.collectFields)(etx, query, etx.operation.selectionSet, Object.create(null), Object.create(null));
        let fieldsCount = Object.keys(fields).length;
        if (fieldsCount > maxRootFields) {
            return [
                new apollo_server_core_1.UserInputError(`only ${maxRootFields} root fields allowed, but got ${fieldsCount}`)
            ];
        }
    }
    return [];
}
//# sourceMappingURL=execute.js.map