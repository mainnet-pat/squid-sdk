import { Logger } from '@subsquid/logger';
import { Database } from '@subsquid/util-internal-processor-tools';
import { Range } from '@subsquid/util-internal-range';
import { Chain } from './interfaces/chain.js';
import { BlockData, FieldSelection, Transaction } from './interfaces/data.js';
import { TransactionRequest } from './interfaces/data-request.js';
import { RpcValidationFlags } from './ds-rpc/rpc.js';
export interface RpcEndpointSettings {
    /**
     * RPC endpoint URL (either http(s) or ws(s))
     */
    url: string;
    /**
     * Maximum number of ongoing concurrent requests
     */
    capacity?: number;
    /**
     * Maximum number of requests per second
     */
    rateLimit?: number;
    /**
     * Request timeout in `ms`
     */
    requestTimeout?: number;
    /**
     * Maximum number of retry attempts.
     *
     * By default, retries all "retryable" errors indefinitely.
     */
    retryAttempts?: number;
    /**
     * Maximum number of requests in a single batch call
     */
    maxBatchCallSize?: number;
    /**
     * HTTP headers
     */
    headers?: Record<string, string>;
}
export interface RpcDataIngestionSettings {
    /**
     * Poll interval for new blocks in `ms`
     *
     * Poll mechanism is used to get new blocks via HTTP connection.
     */
    headPollInterval?: number;
    /**
     * When websocket subscription is used to get new blocks,
     * this setting specifies timeout in `ms` after which connection
     * will be reset and subscription re-initiated if no new block where received.
     */
    newHeadTimeout?: number;
    /**
     * Disable RPC data ingestion entirely
     */
    disabled?: boolean;
    /**
     * Flags to switch off the data consistency checks
     */
    validationFlags?: RpcValidationFlags;
}
export interface GatewaySettings {
    /**
     * Subsquid Network Gateway url
     */
    url: string;
    /**
     * Request timeout in ms
     */
    requestTimeout?: number;
}
/**
 * @deprecated
 */
export type ArchiveSettings = GatewaySettings;
/**
 * @deprecated
 */
export type DataSource = ArchiveDataSource | ChainDataSource;
interface ArchiveDataSource {
    /**
     * Subsquid evm archive endpoint URL
     */
    archive: string | GatewaySettings;
    /**
     * Chain node RPC endpoint URL
     */
    chain?: string | RpcEndpointSettings;
}
interface ChainDataSource {
    archive?: undefined;
    /**
     * Chain node RPC endpoint URL
     */
    chain: string | RpcEndpointSettings;
}
interface BlockRange {
    /**
     * Block range
     */
    range?: Range;
}
/**
 * API and data that is passed to the data handler
 */
export interface DataHandlerContext<Store, F extends FieldSelection = {}> {
    /**
     * @internal
     */
    _chain: Chain;
    /**
     * An instance of a structured logger.
     */
    log: Logger;
    /**
     * Storage interface provided by the database
     */
    store: Store;
    /**
     * List of blocks to map and process
     */
    blocks: BlockData<F>[];
    /**
     * List of mempool transactions to process
     */
    mempoolTransactions: Transaction<F>[];
    /**
     * Signals, that the processor reached the head of a chain.
     *
     * The head block is always included in `.blocks`.
     */
    isHead: boolean;
}
export type BchBatchProcessorFields<T> = T extends BchBatchProcessor<infer F> ? F : never;
/**
 * Provides methods to configure and launch data processing.
 */
export declare class BchBatchProcessor<F extends FieldSelection = {}> {
    private requests;
    private blockRange?;
    private fields?;
    private finalityConfirmation?;
    private archive?;
    private rpcIngestSettings?;
    private rpcEndpoint?;
    private p2pEndpoint?;
    private running;
    private hotDataSource;
    /**
     * @deprecated Use {@link .setGateway()}
     */
    setArchive(url: string | GatewaySettings): this;
    /**
     * Set Subsquid Network Gateway endpoint (ex Archive).
     *
     * Subsquid Network allows to get data from finalized blocks up to
     * infinite times faster and more efficient than via regular RPC.
     *
     * @example
     * processor.setGateway('https://v2.archive.subsquid.io/network/ethereum-mainnet')
     */
    setGateway(url: string | GatewaySettings): this;
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
    setRpcEndpoint(url: string | RpcEndpointSettings | undefined): this;
    /**
     * Optionaly set chain p2p endpoint, which is used to fetch blocks, monitor mempool, etc. Will default to a hardcoded one
     *
     * @example
     * // just pass a an 'ip:port' string, see https://gitlab.com/bitcoin-cash-node/bitcoin-cash-node/-/blob/master/src/chainparamsseeds.h
     * processor.setP2pEndpoint('3.142.98.179:8333')
     *
     */
    setP2pEndpoint(url: string): this;
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
    setDataSource(src: DataSource): this;
    /**
     * Set up RPC data ingestion settings
     */
    setRpcDataIngestionSettings(settings: RpcDataIngestionSettings): this;
    /**
     * @deprecated Use {@link .setRpcDataIngestionSettings()} instead
     */
    setChainPollInterval(ms: number): this;
    /**
     * Never use RPC endpoint for data ingestion.
     *
     * @deprecated This is the same as `.setRpcDataIngestionSettings({disabled: true})`
     */
    useArchiveOnly(yes?: boolean): this;
    /**
     * Distance from the head block behind which all blocks are considered to be finalized.
     */
    setFinalityConfirmation(nBlocks: number): this;
    /**
     * Configure a set of fetched fields
     */
    setFields<T extends FieldSelection>(fields: T): BchBatchProcessor<T>;
    private add;
    /**
     * By default, the processor will fetch only blocks
     * which contain requested items. This method
     * modifies such behaviour to fetch all chain blocks.
     *
     * Optionally a range of blocks can be specified
     * for which the setting should be effective.
     */
    includeAllBlocks(range?: Range): this;
    addTransaction(options: TransactionRequest & BlockRange): this;
    /**
     * Limits the range of blocks to be processed.
     *
     * When the upper bound is specified,
     * the processor will terminate with exit code 0 once it reaches it.
     */
    setBlockRange(range?: Range): this;
    /**
     * Sets the port for a built-in prometheus metrics server.
     *
     * By default, the value of `PROMETHEUS_PORT` environment
     * variable is used. When it is not set,
     * the processor will pick up an ephemeral port.
     */
    setPrometheusPort(port: number | string): this;
    private assertNotRunning;
    private getLogger;
    private getSquidId;
    private getPrometheusServer;
    private getChainRpcClient;
    private getChain;
    private getHotDataSource;
    private getArchiveDataSource;
    private getBatchRequests;
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
    run<Store>(database: Database<Store>, handler: (ctx: DataHandlerContext<Store, F>) => Promise<void>): void;
}
export {};
//# sourceMappingURL=processor.d.ts.map