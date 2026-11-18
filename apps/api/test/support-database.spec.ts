import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertSafeTestDatabase } from './support/database.js';

// The guard in test/support/database.ts that keeps database tests off any shared
// environment.

const LOCAL = 'postgres://feengo_migrator:pw@127.0.0.1:5432/feengo';

describe('test database guard', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('S0 database tests run only against this machine in test or local', () => {
    for (const appEnv of ['test', 'local']) {
      vi.stubEnv('APP_ENV', appEnv);
      expect(assertSafeTestDatabase('DATABASE_MIGRATOR_URL', LOCAL)).toBe(LOCAL);
      const ci = 'postgres://feengo_migrator:pw@localhost:5432/feengo';
      expect(assertSafeTestDatabase('DATABASE_MIGRATOR_URL', ci)).toBe(ci);
    }
  });

  it('S0 database tests refuse a staging or production APP_ENV', () => {
    for (const appEnv of ['staging', 'production']) {
      vi.stubEnv('APP_ENV', appEnv);
      expect(() => assertSafeTestDatabase('DATABASE_MIGRATOR_URL', LOCAL)).toThrow(
        `Database tests refuse to run: APP_ENV is ${appEnv}`,
      );
    }
  });

  it('S0 database tests refuse a database on another host, without printing its URL', () => {
    vi.stubEnv('APP_ENV', 'test');
    for (const url of [
      'postgres://feengo_migrator:never-print-me@db.staging.example:5432/feengo',
      'postgres://feengo_migrator:never-print-me@10.0.0.5:5432/feengo',
      'not a url never-print-me',
    ]) {
      let message = '';
      try {
        assertSafeTestDatabase('DATABASE_MIGRATOR_URL', url);
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).toBe(
        'Database tests refuse to run: DATABASE_MIGRATOR_URL must point at localhost or 127.0.0.1.',
      );
    }
  });
});
