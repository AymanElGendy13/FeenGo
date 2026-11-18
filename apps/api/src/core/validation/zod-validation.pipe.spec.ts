import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ProblemException } from '../errors/problem.js';
import { NO_QUERY, ZodValidationPipe } from './zod-validation.pipe.js';

function problemOf(run: () => unknown): ProblemException {
  try {
    run();
  } catch (error) {
    if (error instanceof ProblemException) {
      return error;
    }
    throw error;
  }
  throw new Error('expected a ProblemException');
}

describe('request validation', () => {
  it('S0 query validation accepts an empty query', () => {
    expect(new ZodValidationPipe(NO_QUERY).transform({})).toEqual({});
  });

  it('S0 query validation reports each unknown query parameter as UNKNOWN_FIELD, without its value', () => {
    const query = Object.assign(Object.create(null) as object, {
      phone: '+201000000789',
      'a/b~c': '1',
    });
    const problem = problemOf(() => new ZodValidationPipe(NO_QUERY).transform(query));
    expect(problem.status).toBe(400);
    expect(problem.errorCode).toBe('VALIDATION_FAILED');
    expect(problem.errors).toEqual([
      { field: '/phone', code: 'UNKNOWN_FIELD' },
      { field: '/a~1b~0c', code: 'UNKNOWN_FIELD' },
    ]);
    expect(JSON.stringify(problem.errors)).not.toContain('201000000789');
  });

  it('S0 request validation reports any other mismatch as NOT_ALLOWED_VALUE', () => {
    const schema = z.strictObject({ size: z.enum(['small', 'large']) });
    const problem = problemOf(() => new ZodValidationPipe(schema).transform({ size: 'huge' }));
    expect(problem.errors).toEqual([{ field: '/size', code: 'NOT_ALLOWED_VALUE' }]);
  });
});
