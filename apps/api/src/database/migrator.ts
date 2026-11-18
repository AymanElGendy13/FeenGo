// The migration command (docs/ARCHITECTURE.md section 5.1).
//
//   node src/database/migrator.ts latest     every pending migration (pnpm db:migrate)
//   node src/database/migrator.ts down-all   down to zero, local and test only
//                                            (pnpm db:migrate:down-all)
//
// It connects as feengo_migrator through DATABASE_MIGRATOR_URL, never as the app role.
// It runs from source with Node 26's built-in type stripping, and from dist/ after
// `nest build` as plain JavaScript. Type stripping resolves import paths exactly as
// written, so this file and the migrations import packages only, never another
// source file: keep it that way, and use only erasable TypeScript syntax here (no
// enums, namespaces or parameter properties).

import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Kysely, PostgresDialect } from 'kysely';
import {
  FileMigrationProvider,
  Migrator,
  NO_MIGRATIONS,
  type Migration,
  type MigrationProvider,
  type MigrationResultSet,
} from 'kysely/migration';
import pg from 'pg';
import { z } from 'zod';

/** The same list as the API's config (src/core/config/config.schema.ts). */
const APP_ENVS = ['local', 'test', 'staging', 'production'] as const;
export type MigratorAppEnv = (typeof APP_ENVS)[number];

/** Down migrations are blocked outside development (section 5.1). */
const DOWN_ALLOWED_ENVS: readonly MigratorAppEnv[] = ['local', 'test'];

export const MIGRATIONS_FOLDER = fileURLToPath(new URL('./migrations/', import.meta.url));

/** `YYYYMMDDHHmm_<name>`: twelve digits, then a snake_case name. */
const MIGRATION_NAME = /^\d{12}_[a-z][a-z0-9_]*$/;

const migratorEnvSchema = z.object({
  APP_ENV: z.enum(APP_ENVS),
  DATABASE_MIGRATOR_URL: z.string().refine((value) => {
    try {
      return ['postgres:', 'postgresql:'].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }),
});

type MigratorEnvKey = keyof z.input<typeof migratorEnvSchema>;

// Written out by hand so that a message never repeats zod's text or the value.
const REQUIREMENTS: Record<MigratorEnvKey, string> = {
  APP_ENV: `one of ${APP_ENVS.join(', ')}`,
  DATABASE_MIGRATOR_URL: 'a postgres:// or postgresql:// URL for the feengo_migrator role',
};

export interface MigratorConfig {
  appEnv: MigratorAppEnv;
  databaseMigratorUrl: string;
}

export type MigratorCommand = 'latest' | 'down-all';

/** The configuration is missing or wrong. The message names variables, never values. */
export class MigratorConfigError extends Error {
  constructor(keys: readonly MigratorEnvKey[], env: Readonly<Record<string, string | undefined>>) {
    const lines = keys.map((key) =>
      env[key] === undefined || env[key] === ''
        ? `  - ${key} is missing; set it to ${REQUIREMENTS[key]}.`
        : `  - ${key} is invalid; it must be ${REQUIREMENTS[key]}.`,
    );
    super(`The migrator cannot run because its configuration is not valid:\n${lines.join('\n')}`);
    this.name = 'MigratorConfigError';
  }
}

/** A down migration was asked for where it is not allowed. */
export class DownMigrationRefusedError extends Error {
  constructor(appEnv: MigratorAppEnv) {
    super(
      `Refusing to migrate down: APP_ENV is ${appEnv}. Down migrations run only when APP_ENV ` +
        `is ${DOWN_ALLOWED_ENVS.join(' or ')}. To undo a change in ${appEnv}, write a new ` +
        'forward migration.',
    );
    this.name = 'DownMigrationRefusedError';
  }
}

export function loadMigratorConfig(
  env: Readonly<Record<string, string | undefined>>,
): MigratorConfig {
  const keys = Object.keys(REQUIREMENTS) as MigratorEnvKey[];
  const input = Object.fromEntries(
    keys.map((key) => [key, env[key] === '' ? undefined : env[key]]),
  );
  const result = migratorEnvSchema.safeParse(input);
  if (!result.success) {
    const failed = new Set(result.error.issues.map((issue) => issue.path[0]));
    throw new MigratorConfigError(
      keys.filter((key) => failed.has(key)),
      env,
    );
  }
  return {
    appEnv: result.data.APP_ENV,
    databaseMigratorUrl: result.data.DATABASE_MIGRATOR_URL,
  };
}

export function assertDownAllowed(appEnv: MigratorAppEnv): void {
  if (!DOWN_ALLOWED_ENVS.includes(appEnv)) {
    throw new DownMigrationRefusedError(appEnv);
  }
}

/**
 * Kysely's FileMigrationProvider, importing through file URLs (safe for ES modules on
 * every platform), and refusing a file whose name breaks the naming rule, so a
 * misnamed migration fails loudly instead of running out of order.
 */
export function migrationProvider(folder: string = MIGRATIONS_FOLDER): MigrationProvider {
  const files = new FileMigrationProvider({
    fs,
    path,
    migrationFolder: folder,
    import: (filePath: string) => import(pathToFileURL(filePath).href),
  });
  return {
    async getMigrations(): Promise<Record<string, Migration>> {
      const migrations = await files.getMigrations();
      const misnamed = Object.keys(migrations).filter((name) => !MIGRATION_NAME.test(name));
      if (misnamed.length > 0) {
        throw new Error(
          `Migration file names must be YYYYMMDDHHmm_<snake_case_name>: ${misnamed.join(', ')}`,
        );
      }
      return migrations;
    },
  };
}

export interface MigratorOptions {
  /** Schema of Kysely's own migration tables; `public` unless a test isolates itself. */
  migrationTableSchema?: string;
  folder?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- migrations see the database as it is at their point in history, not as the generated types describe it today
export function createMigrator(db: Kysely<any>, options: MigratorOptions = {}): Migrator {
  return new Migrator({
    db,
    provider: migrationProvider(options.folder),
    migrationTableSchema: options.migrationTableSchema ?? 'public',
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see createMigrator
export function createMigratorDatabase(databaseMigratorUrl: string): Kysely<any> {
  return new Kysely({
    dialect: new PostgresDialect({
      pool: new pg.Pool({
        connectionString: databaseMigratorUrl,
        application_name: 'feengo-migrator',
        max: 2,
        connectionTimeoutMillis: 10_000,
      }),
    }),
  });
}

/** Runs a command and returns Kysely's result set; never throws for a failed migration. */
export async function runMigrations(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see createMigrator
  db: Kysely<any>,
  command: MigratorCommand,
  options: MigratorOptions = {},
): Promise<MigrationResultSet> {
  const migrator = createMigrator(db, options);
  return command === 'latest' ? migrator.migrateToLatest() : migrator.migrateTo(NO_MIGRATIONS);
}

/** Replaces the connection URL and its password wherever they appear in a message. */
export function redactor(databaseUrl: string): (text: string) => string {
  const secrets = [databaseUrl];
  try {
    const { password } = new URL(databaseUrl);
    if (password !== '') {
      secrets.push(password, decodeURIComponent(password));
    }
  } catch {
    // The URL was validated before; nothing more to hide.
  }
  return (text) =>
    secrets
      .filter((secret) => secret.length > 0)
      .sort((a, b) => b.length - a.length)
      .reduce((out, secret) => out.split(secret).join('[redacted]'), text);
}

export interface MigratorOutput {
  out: (line: string) => void;
  err: (line: string) => void;
}

const COMMANDS: readonly MigratorCommand[] = ['latest', 'down-all'];

/** The command line: returns the exit code. Prints names and outcomes, never the URL. */
export async function main(
  args: readonly string[],
  env: Readonly<Record<string, string | undefined>>,
  output: MigratorOutput,
): Promise<number> {
  const command = args[0];
  if (args.length !== 1 || !COMMANDS.includes(command as MigratorCommand)) {
    output.err(`Usage: migrator <${COMMANDS.join('|')}>`);
    return 2;
  }

  let config: MigratorConfig;
  try {
    config = loadMigratorConfig(env);
    if (command === 'down-all') {
      assertDownAllowed(config.appEnv);
    }
  } catch (error) {
    if (error instanceof MigratorConfigError || error instanceof DownMigrationRefusedError) {
      output.err(error.message);
      return 1;
    }
    throw error;
  }

  const redact = redactor(config.databaseMigratorUrl);
  const db = createMigratorDatabase(config.databaseMigratorUrl);
  try {
    const { error, results = [] } = await runMigrations(db, command as MigratorCommand);
    for (const result of results) {
      output.out(`${result.status}: ${result.direction} ${result.migrationName}`);
    }
    if (error !== undefined) {
      const message = error instanceof Error ? error.message : String(error);
      output.err(`Migration failed: ${redact(message)}`);
      return 1;
    }
    if (results.length === 0) {
      output.out(command === 'latest' ? 'No pending migrations.' : 'No migrations to undo.');
    }
    return 0;
  } catch (error) {
    // Connection and lock errors arrive here, outside Kysely's result set.
    const message = error instanceof Error ? error.message : String(error);
    output.err(`Migration failed: ${redact(message)}`);
    return 1;
  } finally {
    await db.destroy();
  }
}

// The repository's root .env, read if it exists and only when APP_ENV is unset or
// `local`, as the API does (src/main.ts). Variables already set take precedence.
function loadLocalEnvFile(): void {
  const file = fileURLToPath(new URL('../../../../.env', import.meta.url));
  const appEnv = process.env.APP_ENV;
  if ((appEnv === undefined || appEnv === 'local') && existsSync(file)) {
    process.loadEnvFile(file);
  }
}

if (import.meta.main) {
  loadLocalEnvFile();
  process.exitCode = await main(process.argv.slice(2), process.env, {
    out: (line) => process.stdout.write(`${line}\n`),
    err: (line) => process.stderr.write(`${line}\n`),
  });
}
