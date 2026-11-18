import type { EnvSource } from '../../src/core/index.js';

// The local Compose services (docker-compose.yml, .env.example). CI can point the
// tests elsewhere by setting DATABASE_URL and REDIS_URL.
const LOCAL_DATABASE_URL = 'postgres://feengo_app:local-app-password@127.0.0.1:5432/feengo';
const LOCAL_REDIS_URL = 'redis://127.0.0.1:6379';

/** A complete, valid test environment; `overrides` replace or (with undefined) remove variables. */
export function testEnv(overrides: Record<string, string | undefined> = {}): EnvSource {
  return {
    APP_ENV: 'test',
    PORT: '3000',
    LOG_LEVEL: 'silent',
    TRUST_PROXY: '0',
    DATABASE_URL: process.env.DATABASE_URL ?? LOCAL_DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL ?? LOCAL_REDIS_URL,
    ...overrides,
  };
}

/** The same URL with its port replaced. */
export function withPort(url: string | undefined, port: number): string {
  const parsed = new URL(url ?? '');
  parsed.port = String(port);
  return parsed.toString();
}
