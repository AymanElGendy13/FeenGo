// The log shape of an error (section 4.5): `err: { errorType, errorCode, message, stack }`.
//
// Errors are logged under names the redaction wildcards do not touch: `*.code` and
// `*.name` would otherwise blank them. Nothing else is copied from the error, so
// database fields that can hold row values (`detail`, `where`, `parameters`) and any
// other property never reach a log.

export interface SerializedError {
  errorType: string;
  errorCode?: string;
  message: string;
  stack?: string;
}

// Codes that are safe to copy when an error has no `errorCode` of its own: Node and
// system codes (ECONNREFUSED, ERR_INVALID_URL) and PostgreSQL SQLSTATE codes (23505).
// A `code` in any other form is not copied, because it could be a value such as a
// sign-in code.
const NODE_CODE = /^(E[A-Z0-9]+|ERR_[A-Z0-9_]+)$/;
const SQLSTATE = /^[0-9A-Z]{5}$/;

function errorTypeOf(error: Error): string {
  // The class name, not `error.name`, which any code can set to anything.
  const name: unknown = (error.constructor as { name?: unknown } | undefined)?.name;
  return typeof name === 'string' && name.length > 0 ? name : 'Error';
}

function errorCodeOf(error: Error, errorType: string): string | undefined {
  const own: unknown = (error as { errorCode?: unknown }).errorCode;
  if (typeof own === 'string') {
    return own;
  }
  const code: unknown = (error as { code?: unknown }).code;
  if (typeof code !== 'string') {
    return undefined;
  }
  if (NODE_CODE.test(code)) {
    return code;
  }
  if (errorType === 'DatabaseError' && SQLSTATE.test(code)) {
    return code;
  }
  return undefined;
}

function framesOf(stack: unknown): string[] {
  if (typeof stack !== 'string') {
    return [];
  }
  // Only the "at ..." lines. The first line repeats `name: message` as they were when
  // the error was made, and `name` may have been planted.
  return stack.split('\n').filter((line) => /^\s+at /.test(line));
}

export function serializeError(error: unknown): SerializedError {
  if (!(error instanceof Error)) {
    // A thrown string or object may hold anything, so none of it is logged.
    return { errorType: 'NonError', message: 'A value that is not an Error was thrown.' };
  }
  const errorType = errorTypeOf(error);
  const errorCode = errorCodeOf(error, errorType);
  const message = typeof error.message === 'string' ? error.message : '';
  const frames = framesOf(error.stack);
  return {
    errorType,
    ...(errorCode === undefined ? {} : { errorCode }),
    message,
    ...(frames.length === 0 ? {} : { stack: [`${errorType}: ${message}`, ...frames].join('\n') }),
  };
}
