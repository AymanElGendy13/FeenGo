import { describe, expect, it } from 'vitest';
import { ConfigValidationError, loadConfig, type EnvSource } from './config.schema.js';

const valid: EnvSource = {
  APP_ENV: 'test',
  PORT: '3000',
  LOG_LEVEL: 'info',
  TRUST_PROXY: '1',
  DATABASE_URL: 'postgres://feengo_app:pw@127.0.0.1:5432/feengo',
  REDIS_URL: 'redis://127.0.0.1:6379',
};

function errorFor(env: EnvSource): ConfigValidationError {
  try {
    loadConfig(env);
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      return error;
    }
    throw error;
  }
  throw new Error('expected loadConfig to throw');
}

describe('config', () => {
  it('S0 config accepts a complete environment and converts its values', () => {
    expect(loadConfig(valid)).toEqual({
      appEnv: 'test',
      port: 3000,
      logLevel: 'info',
      trustProxy: 1,
      databaseUrl: valid.DATABASE_URL,
      redisUrl: valid.REDIS_URL,
    });
  });

  it('S0 config start-up fails with no DATABASE_URL', () => {
    const error = errorFor({ ...valid, DATABASE_URL: undefined });
    expect(error.variables).toEqual(['DATABASE_URL']);
    expect(error.message).toContain('DATABASE_URL is missing');
  });

  it('S0 config treats an empty variable as missing', () => {
    const error = errorFor({ ...valid, REDIS_URL: '' });
    expect(error.message).toContain('REDIS_URL is missing');
  });

  it('S0 config start-up fails with a bad APP_ENV', () => {
    const error = errorFor({ ...valid, APP_ENV: 'prod' });
    expect(error.variables).toEqual(['APP_ENV']);
    expect(error.message).toContain(
      'APP_ENV is invalid; it must be one of local, test, staging, production',
    );
  });

  it.each([
    ['PORT', '0'],
    ['PORT', '70000'],
    ['PORT', '3000abc'],
    ['LOG_LEVEL', 'verbose'],
    ['TRUST_PROXY', '-1'],
    ['TRUST_PROXY', 'true'],
    ['DATABASE_URL', 'mysql://127.0.0.1/feengo'],
    ['REDIS_URL', 'http://127.0.0.1:6379'],
  ])('S0 config rejects %s=%s', (key, value) => {
    expect(errorFor({ ...valid, [key]: value }).variables).toEqual([key]);
  });

  it('S0 config lists every missing variable at once', () => {
    expect(errorFor({}).variables).toEqual([
      'APP_ENV',
      'PORT',
      'LOG_LEVEL',
      'TRUST_PROXY',
      'DATABASE_URL',
      'REDIS_URL',
    ]);
  });

  it('Q-05 config error messages never include a value', () => {
    const secret = 'Sup3rSecretValue';
    const env: EnvSource = {
      APP_ENV: `staging-${secret}`,
      PORT: `${secret}`,
      LOG_LEVEL: `${secret}`,
      TRUST_PROXY: `${secret}`,
      DATABASE_URL: `postgres-${secret}://feengo_app:${secret}@db/feengo`,
      REDIS_URL: `not a url ${secret}`,
    };
    const error = errorFor(env);
    expect(error.variables).toHaveLength(6);
    expect(error.message).not.toContain(secret);
    expect(String(error.stack)).not.toContain(secret);
    expect(JSON.stringify(error)).not.toContain(secret);
  });
});
