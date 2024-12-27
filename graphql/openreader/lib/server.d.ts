import { Logger } from '@subsquid/logger';
import { ListeningServer } from '@subsquid/util-internal-http-server';
import { KeyValueCache, PluginDefinition } from 'apollo-server-core';
import express from 'express';
import { GraphQLSchema } from 'graphql';
import type { Pool } from 'pg';
import { Context } from './context';
import type { DbType } from './db';
import type { Model } from './model';
import { Dialect } from './dialect';
export interface ServerOptions {
    port: number | string;
    model: Model;
    connection: Pool;
    dbType?: DbType;
    dialect?: Dialect;
    graphiqlConsole?: boolean;
    log?: Logger;
    maxRequestSizeBytes?: number;
    maxRootFields?: number;
    maxResponseNodes?: number;
    subscriptions?: boolean;
    subscriptionPollInterval?: number;
    subscriptionConnection?: Pool;
    subscriptionMaxResponseNodes?: number;
    cache?: KeyValueCache;
}
export declare function serve(options: ServerOptions): Promise<ListeningServer>;
export type Dispose = () => Promise<void>;
export interface ApolloOptions {
    port: number | string;
    disposals: Dispose[];
    context: () => Context;
    schema: GraphQLSchema;
    plugins?: PluginDefinition[];
    subscriptions?: boolean;
    graphiqlConsole?: boolean;
    log?: Logger;
    maxRequestSizeBytes?: number;
    maxRootFields?: number;
    cache?: KeyValueCache;
}
export declare function runApollo(options: ApolloOptions): Promise<ListeningServer>;
export declare function addServerCleanup(disposals: Dispose[], server: Promise<ListeningServer>, log?: Logger): Promise<ListeningServer>;
export declare function setupGraphiqlConsole(app: express.Application): void;
//# sourceMappingURL=server.d.ts.map