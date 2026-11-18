import { randomBytes } from 'node:crypto';
import { Kysely, PostgresDialect, sql } from 'kysely';
import pg from 'pg';
import type { Database } from '../../src/core/index.js';
import { createMigratorDatabase, runMigrations } from '../../src/database/migrator.js';

// The local Compose services (docker-compose.yml, .env.example). CI points the tests
// at its service container by setting DATABASE_MIGRATOR_URL and DATABASE_URL.
const LOCAL_MIGRATOR_URL =
  'postgres://feengo_migrator:local-migrator-password@127.0.0.1:5432/feengo';
const LOCAL_APP_URL = 'postgres://feengo_app:local-app-password@127.0.0.1:5432/feengo';

const SAFE_APP_ENVS = ['test', 'local'];
const SAFE_HOSTS = ['localhost', '127.0.0.1'];

/**
 * These tests create and drop schemas and migrate the database, so they refuse to
 * run anywhere but a local or CI database: APP_ENV must be test or local (unset
 * counts as local, as in src/main.ts), and the database host must be this machine.
 */
export function assertSafeTestDatabase(name: string, url: string): string {
  const appEnv = process.env.APP_ENV ?? 'local';
  if (!SAFE_APP_ENVS.includes(appEnv)) {
    throw new Error(
      `Database tests refuse to run: APP_ENV is ${appEnv}; they run only when it is test or local.`,
    );
  }
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    // Reported below without the URL, which may hold a password.
  }
  if (!SAFE_HOSTS.includes(host)) {
    throw new Error(
      `Database tests refuse to run: ${name} must point at ${SAFE_HOSTS.join(' or ')}.`,
    );
  }
  return url;
}

export const migratorUrl = (): string =>
  assertSafeTestDatabase(
    'DATABASE_MIGRATOR_URL',
    process.env.DATABASE_MIGRATOR_URL ?? LOCAL_MIGRATOR_URL,
  );
export const appUrl = (): string =>
  assertSafeTestDatabase('DATABASE_URL', process.env.DATABASE_URL ?? LOCAL_APP_URL);

/** Kysely over a small pool; `searchPath` points unqualified names at one schema. */
export function connect(url: string, searchPath?: string): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new pg.Pool({
        connectionString: url,
        application_name: 'feengo-api-tests',
        max: 2,
        ...(searchPath === undefined ? {} : { options: `-c search_path=${searchPath}` }),
      }),
    }),
  });
}

export interface IsolatedSchema {
  name: string;
  /** Connected as feengo_migrator with only this schema on the search path. */
  db: Kysely<Database>;
  drop(): Promise<void>;
}

/**
 * A new, empty schema owned by feengo_migrator, so a test can migrate up and down
 * without touching the shared `public` schema or another test. The migrator role
 * has no CREATEDB (section 5.1), but as the database owner it may create schemas.
 */
export async function createIsolatedSchema(): Promise<IsolatedSchema> {
  const name = `feengo_test_${randomBytes(6).toString('hex')}`;
  const admin = createMigratorDatabase(migratorUrl());
  try {
    await sql`CREATE SCHEMA ${sql.id(name)}`.execute(admin);
  } finally {
    await admin.destroy();
  }
  const db = connect(migratorUrl(), name);
  return {
    name,
    db,
    async drop() {
      await sql`DROP SCHEMA ${sql.id(name)} CASCADE`.execute(db);
      await db.destroy();
    },
  };
}

/**
 * Brings the shared database to the latest migration, as `pnpm db:migrate` does, for
 * tests that need the real `public` schema (the app role's default privileges apply
 * there only). Forward only; safe to run from several test files at once, because
 * Kysely's migrator holds a database lock while it runs.
 */
export async function migrateSharedDatabase(): Promise<void> {
  const db = createMigratorDatabase(migratorUrl());
  try {
    const { error } = await runMigrations(db, 'latest');
    if (error !== undefined) {
      throw error;
    }
  } finally {
    await db.destroy();
  }
}

/** The PostgreSQL error a query failed with: its SQLSTATE and constraint name. */
export async function violation(
  query: Promise<unknown>,
): Promise<{ code: string; constraint: string | undefined }> {
  try {
    await query;
  } catch (error) {
    if (error instanceof pg.DatabaseError) {
      return { code: error.code ?? '', constraint: error.constraint };
    }
    throw error;
  }
  throw new Error('Expected the query to fail, but it succeeded');
}

export const CHECK_VIOLATION = '23514';
export const UNIQUE_VIOLATION = '23505';
export const FOREIGN_KEY_VIOLATION = '23503';
export const RESTRICT_VIOLATION = '23001';
export const INSUFFICIENT_PRIVILEGE = '42501';
