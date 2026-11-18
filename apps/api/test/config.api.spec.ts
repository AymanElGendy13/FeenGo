import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.factory.js';
import { ConfigValidationError, type EnvSource } from '../src/core/index.js';
import { createTestApp } from './support/app.js';
import { testEnv } from './support/env.js';

// Start-up with a bad environment, through the real Nest bootstrap.

const SECRET = 'k9-Secret-Value-Do-Not-Print';

/** Runs `start`, capturing stdout and stderr, and returns the error it fails with. */
async function startupError(start: () => Promise<unknown>): Promise<{
  error: unknown;
  output: string;
}> {
  const written: string[] = [];
  for (const stream of [process.stdout, process.stderr]) {
    vi.spyOn(stream, 'write').mockImplementation(((chunk: unknown) => {
      written.push(String(chunk));
      return true;
    }) as typeof stream.write);
  }
  try {
    await start();
  } catch (error) {
    return { error, output: written.join('') };
  } finally {
    vi.restoreAllMocks();
  }
  throw new Error('expected start-up to fail');
}

describe('start-up configuration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('S0 config start-up fails with no DATABASE_URL', async () => {
    const env: EnvSource = testEnv({ DATABASE_URL: undefined });
    const { error } = await startupError(() => createApp({ env }));
    expect(error).toBeInstanceOf(ConfigValidationError);
    expect((error as ConfigValidationError).variables).toEqual(['DATABASE_URL']);
    expect((error as Error).message).toContain('DATABASE_URL is missing');
  });

  it('S0 config start-up fails with a bad APP_ENV', async () => {
    const { error } = await startupError(() =>
      createTestApp({ env: testEnv({ APP_ENV: 'development' }) }),
    );
    expect(error).toBeInstanceOf(ConfigValidationError);
    expect((error as ConfigValidationError).variables).toEqual(['APP_ENV']);
  });

  it('Q-05 config start-up errors never include a value, in the error or in any output', async () => {
    const env = testEnv({
      APP_ENV: SECRET,
      PORT: SECRET,
      DATABASE_URL: `postgres://feengo_app:${SECRET}@127.0.0.1:notaport/feengo`,
      REDIS_URL: `${SECRET}://127.0.0.1:6379`,
    });
    const { error, output } = await startupError(() => createApp({ env }));
    expect(error).toBeInstanceOf(ConfigValidationError);
    expect((error as ConfigValidationError).variables).toEqual([
      'APP_ENV',
      'PORT',
      'DATABASE_URL',
      'REDIS_URL',
    ]);
    expect((error as Error).message).not.toContain(SECRET);
    expect(String((error as Error).stack)).not.toContain(SECRET);
    expect(output).not.toContain(SECRET);
  });
});
