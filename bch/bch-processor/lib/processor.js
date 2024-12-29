"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BchBatchProcessor = void 0;
const http_client_1 = require("@subsquid/http-client");
const logger_1 = require("@subsquid/logger");
const rpc_client_1 = require("@subsquid/rpc-client");
const util_internal_1 = require("@subsquid/util-internal");
const util_internal_archive_client_1 = require("@subsquid/util-internal-archive-client");
const util_internal_processor_tools_1 = require("@subsquid/util-internal-processor-tools");
const util_internal_range_1 = require("@subsquid/util-internal-range");
const util_internal_validation_1 = require("@subsquid/util-internal-validation");
const assert_1 = __importDefault(require("assert"));
const client_js_1 = require("./ds-archive/client.js");
const client_js_2 = require("./ds-rpc/client.js");
const data_js_1 = require("./interfaces/data.js");
const selection_js_1 = require("./mapping/selection.js");
/**
 * Provides methods to configure and launch data processing.
 */
class BchBatchProcessor {
    constructor() {
        this.requests = [];
        this.running = false;
    }
    /**
     * @deprecated Use {@link .setGateway()}
     */
    setArchive(url) {
        return this.setGateway(url);
    }
    /**
     * Set Subsquid Network Gateway endpoint (ex Archive).
     *
     * Subsquid Network allows to get data from finalized blocks up to
     * infinite times faster and more efficient than via regular RPC.
     *
     * @example
     * processor.setGateway('https://v2.archive.subsquid.io/network/ethereum-mainnet')
     */
    setGateway(url) {
        this.assertNotRunning();
        if (typeof url == 'string') {
            this.archive = { url };
        }
        else {
            this.archive = url;
        }
        return this;
    }
    /**
     * Set chain RPC endpoint
     *
     * @example
     * // just pass a URL
     * processor.setRpcEndpoint('https://eth-mainnet.public.blastapi.io')
     *
     * // adjust some connection options
     * processor.setRpcEndpoint({
     *     url: 'https://eth-mainnet.public.blastapi.io',
     *     rateLimit: 10
     * })
     */
    setRpcEndpoint(url) {
        this.assertNotRunning();
        if (typeof url == 'string') {
            this.rpcEndpoint = { url };
        }
        else {
            this.rpcEndpoint = url;
        }
        return this;
    }
    /**
     * Optionaly set chain p2p endpoint, which is used to fetch blocks, monitor mempool, etc. Will default to a hardcoded one
     *
     * @example
     * // just pass a an 'ip:port' string, see https://gitlab.com/bitcoin-cash-node/bitcoin-cash-node/-/blob/master/src/chainparamsseeds.h
     * processor.setP2pEndpoint('3.142.98.179:8333')
     *
     */
    setP2pEndpoint(url) {
        this.assertNotRunning();
        this.p2pEndpoint = url;
        return this;
    }
    /**
     * Sets blockchain data source.
     *
     * @example
     * processor.setDataSource({
     *     archive: 'https://v2.archive.subsquid.io/network/ethereum-mainnet',
     *     chain: 'https://eth-mainnet.public.blastapi.io'
     * })
     *
     * @deprecated Use separate {@link .setGateway()} and {@link .setRpcEndpoint()} methods
     * to specify data sources.
     */
    setDataSource(src) {
        this.assertNotRunning();
        if (src.archive) {
            this.setGateway(src.archive);
        }
        else {
            this.archive = undefined;
        }
        if (src.chain) {
            this.setRpcEndpoint(src.chain);
        }
        else {
            this.rpcEndpoint = undefined;
        }
        return this;
    }
    /**
     * Set up RPC data ingestion settings
     */
    setRpcDataIngestionSettings(settings) {
        this.assertNotRunning();
        this.rpcIngestSettings = settings;
        return this;
    }
    /**
     * @deprecated Use {@link .setRpcDataIngestionSettings()} instead
     */
    setChainPollInterval(ms) {
        (0, assert_1.default)(ms >= 0);
        this.assertNotRunning();
        this.rpcIngestSettings = { ...this.rpcIngestSettings, headPollInterval: ms };
        return this;
    }
    /**
     * Never use RPC endpoint for data ingestion.
     *
     * @deprecated This is the same as `.setRpcDataIngestionSettings({disabled: true})`
     */
    useArchiveOnly(yes) {
        this.assertNotRunning();
        this.rpcIngestSettings = { ...this.rpcIngestSettings, disabled: yes !== false };
        return this;
    }
    /**
     * Distance from the head block behind which all blocks are considered to be finalized.
     */
    setFinalityConfirmation(nBlocks) {
        this.assertNotRunning();
        this.finalityConfirmation = nBlocks;
        return this;
    }
    /**
     * Configure a set of fetched fields
     */
    setFields(fields) {
        this.assertNotRunning();
        let validator = (0, selection_js_1.getFieldSelectionValidator)();
        this.fields = (0, util_internal_validation_1.cast)(validator, fields);
        if (this.fields?.transaction?.sourceOutputs) {
            this.add({ sourceOutputs: true }, { from: this.requests.sort((a, b) => a.range.from - b.range.from)[0].range.from });
        }
        if (this.fields?.transaction?.fee) {
            if (!this.fields?.transaction?.sourceOutputs) {
                throw new Error('Fee calculation requires sourceOutputs');
            }
            this.add({ fee: true }, { from: this.requests.sort((a, b) => a.range.from - b.range.from)[0].range.from });
        }
        return this;
    }
    add(request, range) {
        this.requests.push({
            range: range || { from: 0 },
            request
        });
    }
    /**
     * By default, the processor will fetch only blocks
     * which contain requested items. This method
     * modifies such behaviour to fetch all chain blocks.
     *
     * Optionally a range of blocks can be specified
     * for which the setting should be effective.
     */
    includeAllBlocks(range) {
        this.assertNotRunning();
        this.add({ includeAllBlocks: true }, range);
        return this;
    }
    addTransaction(options) {
        this.assertNotRunning();
        this.add({
            transactions: [mapRequest(options)]
        }, options.range);
        return this;
    }
    /**
     * Limits the range of blocks to be processed.
     *
     * When the upper bound is specified,
     * the processor will terminate with exit code 0 once it reaches it.
     */
    setBlockRange(range) {
        this.assertNotRunning();
        this.blockRange = range;
        return this;
    }
    /**
     * Sets the port for a built-in prometheus metrics server.
     *
     * By default, the value of `PROMETHEUS_PORT` environment
     * variable is used. When it is not set,
     * the processor will pick up an ephemeral port.
     */
    setPrometheusPort(port) {
        this.assertNotRunning();
        this.getPrometheusServer().setPort(port);
        return this;
    }
    assertNotRunning() {
        if (this.running) {
            throw new Error('Settings modifications are not allowed after start of processing');
        }
    }
    getLogger() {
        return (0, logger_1.createLogger)('sqd:processor');
    }
    getSquidId() {
        return (0, util_internal_processor_tools_1.getOrGenerateSquidId)();
    }
    getPrometheusServer() {
        return new util_internal_processor_tools_1.PrometheusServer();
    }
    getChainRpcClient() {
        if (this.rpcEndpoint == null) {
            throw new Error(`use .setRpcEndpoint() to specify chain RPC endpoint`);
        }
        let client = new rpc_client_1.RpcClient({
            url: this.rpcEndpoint.url,
            headers: this.rpcEndpoint.headers,
            maxBatchCallSize: this.rpcEndpoint.maxBatchCallSize ?? 25,
            requestTimeout: this.rpcEndpoint.requestTimeout ?? 10000,
            capacity: this.rpcEndpoint.capacity ?? 2,
            rateLimit: this.rpcEndpoint.rateLimit,
            retryAttempts: this.rpcEndpoint.retryAttempts ?? Number.MAX_SAFE_INTEGER,
            log: this.getLogger().child('rpc', { rpcUrl: this.rpcEndpoint.url })
        });
        this.getPrometheusServer().addChainRpcMetrics(() => client.getMetrics());
        return client;
    }
    getChain() {
        let self = this;
        return {
            get client() {
                return self.getHotDataSource().rpc;
            }
        };
    }
    getHotDataSource() {
        if (this.finalityConfirmation == null) {
            throw new Error(`use .setFinalityConfirmation() to specify number of children required to confirm block's finality`);
        }
        if (!this.hotDataSource) {
            this.hotDataSource = new client_js_2.BchRpcDataSource({
                rpc: this.getChainRpcClient(),
                p2pEndpoint: this.p2pEndpoint,
                finalityConfirmation: this.finalityConfirmation,
                headPollInterval: this.rpcIngestSettings?.headPollInterval,
                newHeadTimeout: this.rpcIngestSettings?.newHeadTimeout,
                validationFlags: this.rpcIngestSettings?.validationFlags,
                log: this.getLogger().child('rpc', { rpcUrl: this.getChainRpcClient().url })
            });
        }
        return this.hotDataSource;
    }
    getArchiveDataSource() {
        let archive = (0, util_internal_1.assertNotNull)(this.archive);
        let log = this.getLogger().child('archive');
        let http = new http_client_1.HttpClient({
            headers: {
                'x-squid-id': this.getSquidId()
            },
            agent: new http_client_1.HttpAgent({
                keepAlive: true
            }),
            log
        });
        return new client_js_1.BchArchive(new util_internal_archive_client_1.ArchiveClient({
            http,
            url: archive.url,
            queryTimeout: archive.requestTimeout,
            log
        }));
    }
    getBatchRequests() {
        let requests = (0, util_internal_range_1.mergeRangeRequests)(this.requests, function merge(a, b) {
            let res = {};
            if (a.includeAllBlocks || b.includeAllBlocks) {
                res.includeAllBlocks = true;
            }
            res.transactions = concatRequestLists(a.transactions, b.transactions);
            // res.logs = concatRequestLists(a.logs, b.logs)
            // res.traces = concatRequestLists(a.traces, b.traces)
            // res.stateDiffs = concatRequestLists(a.stateDiffs, b.stateDiffs)
            return res;
        });
        let fields = addDefaultFields(this.fields);
        for (let req of requests) {
            req.request.fields = fields;
        }
        return (0, util_internal_range_1.applyRangeBound)(requests, this.blockRange);
    }
    /**
     * Run data processing.
     *
     * This method assumes full control over the current OS process as
     * it terminates the entire program in case of error or
     * at the end of data processing.
     *
     * @param database - database is responsible for providing storage to data handlers
     * and persisting mapping progress and status.
     *
     * @param handler - The data handler, see {@link DataHandlerContext} for an API available to the handler.
     */
    run(database, handler) {
        this.assertNotRunning();
        this.running = true;
        let log = this.getLogger();
        (0, util_internal_1.runProgram)(async () => {
            let chain = this.getChain();
            let mappingLog = log.child('mapping');
            if (this.archive == null && this.rpcEndpoint == null) {
                throw new Error('No data source where specified. ' +
                    'Use .setArchive() to specify Subsquid Archive and/or .setRpcEndpoint() to specify RPC endpoint.');
            }
            if (this.archive == null && this.rpcIngestSettings?.disabled) {
                throw new Error('Subsquid Archive is required when RPC data ingestion is disabled');
            }
            return new util_internal_processor_tools_1.Runner({
                database,
                requests: this.getBatchRequests(),
                archive: this.archive ? this.getArchiveDataSource() : undefined,
                hotDataSource: this.rpcEndpoint && !this.rpcIngestSettings?.disabled
                    ? this.getHotDataSource()
                    : undefined,
                allBlocksAreFinal: this.finalityConfirmation === 0,
                prometheus: this.getPrometheusServer(),
                log,
                watchMempool: true,
                process(store, batch) {
                    return handler({
                        _chain: chain,
                        log: mappingLog,
                        store,
                        blocks: batch.blocks,
                        mempoolTransactions: batch.mempoolTransactions ?? [],
                        isHead: batch.isHead
                    });
                }
            }).run();
        }, err => log.fatal(err));
    }
}
exports.BchBatchProcessor = BchBatchProcessor;
__decorate([
    util_internal_1.def,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", logger_1.Logger)
], BchBatchProcessor.prototype, "getLogger", null);
__decorate([
    util_internal_1.def,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], BchBatchProcessor.prototype, "getSquidId", null);
__decorate([
    util_internal_1.def,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", util_internal_processor_tools_1.PrometheusServer)
], BchBatchProcessor.prototype, "getPrometheusServer", null);
__decorate([
    util_internal_1.def,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", rpc_client_1.RpcClient)
], BchBatchProcessor.prototype, "getChainRpcClient", null);
__decorate([
    util_internal_1.def,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], BchBatchProcessor.prototype, "getChain", null);
__decorate([
    util_internal_1.def,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", client_js_2.BchRpcDataSource)
], BchBatchProcessor.prototype, "getHotDataSource", null);
__decorate([
    util_internal_1.def,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", client_js_1.BchArchive)
], BchBatchProcessor.prototype, "getArchiveDataSource", null);
__decorate([
    util_internal_1.def,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Array)
], BchBatchProcessor.prototype, "getBatchRequests", null);
function mapRequest(options) {
    let { range, ...req } = options;
    for (let key in req) {
        let val = req[key];
        if (Array.isArray(val)) {
            req[key] = val.map(s => s.toLowerCase());
        }
    }
    return req;
}
function concatRequestLists(a, b) {
    let result = [];
    if (a) {
        result.push(...a);
    }
    if (b) {
        result.push(...b);
    }
    return result.length == 0 ? undefined : result;
}
function addDefaultFields(fields) {
    return {
        block: mergeDefaultFields(data_js_1.DEFAULT_FIELDS.block, fields?.block),
        transaction: mergeDefaultFields(data_js_1.DEFAULT_FIELDS.transaction, fields?.transaction),
    };
}
function mergeDefaultFields(defaults, selection) {
    let result = { ...defaults };
    for (let key in selection) {
        if (selection[key] != null) {
            if (selection[key]) {
                result[key] = true;
            }
            else {
                delete result[key];
            }
        }
    }
    return result;
}
//# sourceMappingURL=processor.js.map