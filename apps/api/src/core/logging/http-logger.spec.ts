import { pino } from 'pino';
import { describe, expect, it } from 'vitest';
import { loggerOptions } from './http-logger.js';

// Stands in for pg's DatabaseError, whose detail, where and parameters fields can
// hold row values.
class DatabaseError extends Error {
  code = '23505';
  detail = 'Key (phone_e164)=(+201000000456) already exists.';
  where = 'SQL statement "insert into customers values (+201000000456)"';
  parameters = ['+201000000456'];
}

describe('logger options', () => {
  it('Q-05 an Error logged under any key goes through the error serializer', () => {
    const lines: string[] = [];
    const logger = pino(loggerOptions({ appEnv: 'test', logLevel: 'trace' }), {
      write: (line: string) => lines.push(line),
    });
    const pgErrorWithDetail = new DatabaseError('duplicate key value');

    logger.warn({ error: pgErrorWithDetail }, 'under error');
    logger.warn({ cause: new DatabaseError('again') }, 'under cause');
    logger.warn({ err: new DatabaseError('as before') }, 'under err');

    expect(lines).toHaveLength(3);
    const entries = lines.map((line) => JSON.parse(line) as Record<string, unknown>);
    for (const [entry, key] of [
      [entries[0], 'error'],
      [entries[1], 'cause'],
      [entries[2], 'err'],
    ] as const) {
      const logged = entry?.[key] as Record<string, unknown>;
      expect(logged).toMatchObject({ errorType: 'DatabaseError', errorCode: '23505' });
      for (const field of ['detail', 'where', 'parameters']) {
        expect(logged).not.toHaveProperty(field);
      }
    }
    expect(lines.join('\n')).not.toContain('201000000456');
  });
});
