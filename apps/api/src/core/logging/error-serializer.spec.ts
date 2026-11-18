import { describe, expect, it } from 'vitest';
import { ProblemException } from '../errors/problem.js';
import { serializeError } from './error-serializer.js';

class PlantedFailure extends Error {
  readonly errorCode = 'PLANTED_FAILURE';
}

// Stands in for pg's DatabaseError, whose detail, where and parameters fields can
// hold row values.
class DatabaseError extends Error {
  code = '23505';
  detail = 'Key (phone_e164)=(+201000000123) already exists.';
  where = 'SQL statement "insert into customers values (+201000000123)"';
  parameters = ['+201000000123'];
}

describe('error serializer', () => {
  it('Q-05 error serializer keeps errorType and errorCode and drops a planted name and code', () => {
    const error = new PlantedFailure('boom');
    Object.assign(error, { name: 'planted-name-9f1c', code: 'planted-code-4e2a' });
    const serialized = serializeError(error);
    expect(serialized).toMatchObject({
      errorType: 'PlantedFailure',
      errorCode: 'PLANTED_FAILURE',
      message: 'boom',
    });
    expect(Object.keys(serialized).sort()).toEqual(['errorCode', 'errorType', 'message', 'stack']);
    const text = JSON.stringify(serialized);
    expect(text).not.toContain('planted-name-9f1c');
    expect(text).not.toContain('planted-code-4e2a');
    expect(serialized.stack).toMatch(/^PlantedFailure: boom\n\s+at /);
  });

  it('Q-05 error serializer drops database fields that can hold row values', () => {
    const serialized = serializeError(new DatabaseError('duplicate key value'));
    expect(serialized).toMatchObject({ errorType: 'DatabaseError', errorCode: '23505' });
    expect(JSON.stringify(serialized)).not.toContain('+201000000123');
  });

  it('Q-05 error serializer takes the code of a Problem', () => {
    const serialized = serializeError(new ProblemException(503, 'SERVICE_UNAVAILABLE'));
    expect(serialized).toMatchObject({
      errorType: 'ProblemException',
      errorCode: 'SERVICE_UNAVAILABLE',
    });
  });

  it('Q-05 error serializer keeps system codes but not codes that could be values', () => {
    const refused = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
    expect(serializeError(refused).errorCode).toBe('ECONNREFUSED');
    const signInCode = Object.assign(new Error('wrong code'), { code: '123456' });
    expect(serializeError(signInCode).errorCode).toBeUndefined();
    expect(JSON.stringify(serializeError(signInCode))).not.toContain('123456');
  });

  it('Q-05 error serializer logs nothing from a thrown value that is not an Error', () => {
    const serialized = serializeError({ phone: '+201000000123' });
    expect(serialized.errorType).toBe('NonError');
    expect(JSON.stringify(serialized)).not.toContain('+201000000123');
  });
});
