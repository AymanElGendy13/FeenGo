import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import type { Logger } from 'pino';

/**
 * The database schema as Kysely sees it. Empty until C4 adds the first migration and
 * the types generated from it (docs/ARCHITECTURE.md section 5.1).
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- tables arrive in C4
export interface Database {}

/** Injection token for the shared `Kysely<Database>` instance. */
export const DATABASE = Symbol('DATABASE');

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
