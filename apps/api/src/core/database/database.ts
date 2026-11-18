import type { FactoryProvider } from '@nestjs/common';
import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import type { Logger } from 'pino';
import type { DB } from '../../database/index.js';

/**
 * Every table as Kysely sees it, generated from the migrated database by
 * `pnpm db:types` into src/database/schema.generated.ts (section 5.1).
 */
export type Database = DB;

/**
 * Injection token for the shared `Kysely<Database>` instance. Internal to core:
 * feature modules get their own narrowed view through `moduleDatabaseProvider`.
 */
export const DATABASE = Symbol('DATABASE');

/**
 * A module's view of the database: only the tables it owns (section 4.2), so a
 * query on another module's table does not compile. The narrowing covers Kysely's
 * query builder; raw `sql` is not checked against it.
 */
export type ModuleDatabase<Tables extends keyof Database> = Kysely<Pick<Database, Tables>>;

/**
 * Provides the shared Kysely instance under a module's own token, typed with only
 * that module's tables. It is the same object and the same pool at run time:
 *
 *   export const SETTINGS_DATABASE = Symbol('SETTINGS_DATABASE');
 *   providers: [moduleDatabaseProvider<'settings' | 'setting_definitions'>(SETTINGS_DATABASE)]
 *   constructor(@Inject(SETTINGS_DATABASE) db: ModuleDatabase<'settings' | ...>)
 */
export function moduleDatabaseProvider<Tables extends keyof Database>(
  token: symbol,
): FactoryProvider<ModuleDatabase<Tables>> {
  return {
    provide: token,
    inject: [DATABASE],
    // Only the type narrows; Kysely<Database> is not assignable to a Kysely of fewer tables.
    useFactory: (db: Kysely<Database>) => db as unknown as ModuleDatabase<Tables>,
  };
}

/**
 * Kysely over a `pg` pool, connected as the `feengo_app` role through DATABASE_URL
 * (section 5.1). Connections are made on first use, so the API starts even while
 * the database is down; readiness reports it.
 */
export function createDatabase(databaseUrl: string, logger: Logger): Kysely<Database> {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    application_name: 'feengo-api',
    max: 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  });
  // An idle client that loses its connection emits `error` on the pool; without a
  // listener that would end the process.
  pool.on('error', (err) => {
    logger.warn({ err }, 'database connection lost');
  });
  return new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
}
