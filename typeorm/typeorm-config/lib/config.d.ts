import type { DataSourceOptions as OrmConfig } from 'typeorm';
export interface OrmOptions {
    projectDir?: string;
}
export declare const MIGRATIONS_DIR = "db/migrations";
export declare function createOrmConfig(options?: OrmOptions): OrmConfig;
//# sourceMappingURL=config.d.ts.map