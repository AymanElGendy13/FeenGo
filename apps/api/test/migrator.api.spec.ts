import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { migrationProvider } from '../src/database/migrator.js';
import { migratorUrl } from './support/database.js';

// The migration commands as CI and developers run them: `pnpm db:migrate` and
// `pnpm db:migrate:down-all` (apps/api/package.json), from source with Node's own
// type stripping.

const API_DIR = fileURLToPath(new URL('..', import.meta.url));
const scripts = (
  JSON.parse(readFileSync(path.join(API_DIR, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  }
).scripts;

// A password that must never be printed, on a port where nothing listens: a refusal
// has to come before any connection.
const UNREACHABLE_URL = 'postgres://feengo_migrator:never-print-me@127.0.0.1:1/feengo';

/** Runs a package.json script's `node ...` command directly, with exactly `env`. */
function runScript(name: string, env: Record<string, string>) {
  const command = scripts[name];
  expect(command).toMatch(/^node /);
  const [, ...args] = command!.split(' ');
  const result = spawnSync(process.execPath, args, {
    cwd: API_DIR,
    env: { PATH: process.env.PATH ?? '', ...env },
    encoding: 'utf8',
    timeout: 30_000,
  });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

describe('migration commands', () => {
  const tempDirs: string[] = [];

  afterAll(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('S0 db:migrate:down-all refuses when APP_ENV is production', () => {
    for (const appEnv of ['production', 'staging']) {
      const { status, output } = runScript('db:migrate:down-all', {
        APP_ENV: appEnv,
        DATABASE_MIGRATOR_URL: UNREACHABLE_URL,
      });
      expect(status, output).toBe(1);
      expect(output).toContain(`Refusing to migrate down: APP_ENV is ${appEnv}.`);
      expect(output).not.toContain('never-print-me');
      expect(output).not.toContain('127.0.0.1:1');
    }
  });

  it('S0 db:migrate refuses to run without DATABASE_MIGRATOR_URL and never prints a URL', () => {
    const missing = runScript('db:migrate', {
      APP_ENV: 'test',
      DATABASE_URL: 'postgres://feengo_app:app-password@127.0.0.1:1/feengo',
    });
    expect(missing.status).toBe(1);
    expect(missing.output).toContain('DATABASE_MIGRATOR_URL is missing');
    expect(missing.output).not.toContain('app-password');

    const unreachable = runScript('db:migrate', {
      APP_ENV: 'test',
      DATABASE_MIGRATOR_URL: UNREACHABLE_URL,
    });
    expect(unreachable.status).toBe(1);
    expect(unreachable.output).toContain('Migration failed');
    expect(unreachable.output).not.toContain('never-print-me');
  });

  it('S0 db:migrate runs from source and reports nothing pending on a migrated database', () => {
    // The shared database, migrated to latest first if needed; forward only.
    const first = runScript('db:migrate', {
      APP_ENV: 'test',
      DATABASE_MIGRATOR_URL: migratorUrl(),
    });
    expect(first.status, first.output).toBe(0);
    const second = runScript('db:migrate', {
      APP_ENV: 'test',
      DATABASE_MIGRATOR_URL: migratorUrl(),
    });
    expect(second.status, second.output).toBe(0);
    expect(second.output).toContain('No pending migrations.');
    expect(second.output).not.toContain(new URL(migratorUrl()).password);
  });

  it('S0 a migration file that breaks the naming rule is refused', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'feengo-migrations-'));
    tempDirs.push(dir);
    writeFileSync(path.join(dir, '202611182330_good_name.mjs'), 'export async function up() {}\n');
    writeFileSync(path.join(dir, '20261118_short_date.mjs'), 'export async function up() {}\n');

    await expect(migrationProvider(dir).getMigrations()).rejects.toThrow(
      'Migration file names must be YYYYMMDDHHmm_<snake_case_name>: 20261118_short_date',
    );
  });

  it('S0 every committed migration follows the naming rule and has up and down', async () => {
    const migrations = await migrationProvider().getMigrations();
    expect(Object.keys(migrations)).toContain('202611182330_create_settings_tables');
    for (const migration of Object.values(migrations)) {
      expect(typeof migration.up).toBe('function');
      expect(typeof migration.down).toBe('function');
    }
  });
});
