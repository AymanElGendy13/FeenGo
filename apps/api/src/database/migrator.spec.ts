import { describe, expect, it } from 'vitest';
import {
  assertDownAllowed,
  DownMigrationRefusedError,
  loadMigratorConfig,
  MigratorConfigError,
  redactor,
} from './migrator.js';

const URL_WITH_PASSWORD = 'postgres://feengo_migrator:s3cret%2Fpw@db.internal:5432/feengo';

describe('migrator configuration', () => {
  it('S0 the migrator reads APP_ENV and DATABASE_MIGRATOR_URL', () => {
    expect(
      loadMigratorConfig({
        APP_ENV: 'test',
        DATABASE_MIGRATOR_URL: URL_WITH_PASSWORD,
        DATABASE_URL: 'postgres://feengo_app:other@db.internal:5432/feengo',
      }),
    ).toEqual({ appEnv: 'test', databaseMigratorUrl: URL_WITH_PASSWORD });
  });

  it('S0 the migrator never falls back to the app role URL', () => {
    expect(() =>
      loadMigratorConfig({
        APP_ENV: 'test',
        DATABASE_URL: 'postgres://feengo_app:other@db.internal:5432/feengo',
      }),
    ).toThrow(/DATABASE_MIGRATOR_URL is missing/);
  });

  it('S0 a migrator configuration error names the variable and never its value', () => {
    let error: unknown;
    try {
      loadMigratorConfig({ APP_ENV: 'prod', DATABASE_MIGRATOR_URL: 'mysql://root:s3cret@db/x' });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(MigratorConfigError);
    const message = (error as Error).message;
    expect(message).toContain('APP_ENV is invalid');
    expect(message).toContain('DATABASE_MIGRATOR_URL is invalid');
    expect(message).not.toContain('s3cret');
    expect(message).not.toContain('mysql://');
    expect(message).not.toContain('prod,');
  });

  it('S0 down migrations are allowed only in local and test', () => {
    expect(() => assertDownAllowed('local')).not.toThrow();
    expect(() => assertDownAllowed('test')).not.toThrow();
    expect(() => assertDownAllowed('staging')).toThrow(DownMigrationRefusedError);
    expect(() => assertDownAllowed('production')).toThrow(DownMigrationRefusedError);
  });

  it('S0 migrator errors never show the connection URL or its password', () => {
    const redact = redactor(URL_WITH_PASSWORD);
    expect(redact(`could not connect to ${URL_WITH_PASSWORD}`)).toBe(
      'could not connect to [redacted]',
    );
    expect(redact('auth failed with s3cret/pw and s3cret%2Fpw')).toBe(
      'auth failed with [redacted] and [redacted]',
    );
  });
});
