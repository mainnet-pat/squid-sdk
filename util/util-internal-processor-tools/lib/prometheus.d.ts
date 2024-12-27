import { ListeningServer } from '@subsquid/util-internal-prometheus-server';
import { RunnerMetrics } from './runner-metrics';
interface ConnectionMetrics {
    url: string;
    requestsServed: number;
    connectionErrors: number;
}
export declare class PrometheusServer {
    private registry;
    private port?;
    constructor();
    setPort(port: number | string): void;
    addRunnerMetrics(metrics: RunnerMetrics): void;
    addChainRpcMetrics(collect: () => ConnectionMetrics): void;
    serve(): Promise<ListeningServer>;
    private getPort;
}
export {};
//# sourceMappingURL=prometheus.d.ts.map