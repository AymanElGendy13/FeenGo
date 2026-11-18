import type { PipeTransform } from '@nestjs/common';
import { z } from 'zod';
import { ProblemException, type FieldError } from '../errors/problem.js';

// Request validation (docs/ARCHITECTURE.md section 4.3, step 9): a zod schema per
// request body and query, with strict objects, so unknown body fields and unknown
// query parameters are rejected with 400 VALIDATION_FAILED and the field code
// UNKNOWN_FIELD. Field errors name the field only, never its value.

/** The query of an endpoint that takes no query parameters. */
export const NO_QUERY = z.strictObject({});
export type NoQuery = z.output<typeof NO_QUERY>;

/** A JSON Pointer (RFC 6901) to the field at `path`. */
function pointerTo(path: readonly PropertyKey[]): string {
  return path
    .map((part) => `/${String(part).replaceAll('~', '~0').replaceAll('/', '~1')}`)
    .join('');
}

/**
 * The contract's field errors for zod's issues. S0 needs only UNKNOWN_FIELD; any
 * other issue is NOT_ALLOWED_VALUE until the endpoint that needs a finer code (such
 * as REQUIRED or TOO_LONG) adds it here, with its test.
 */
export function fieldErrorsOf(issues: readonly z.core.$ZodIssue[]): FieldError[] {
  return issues.flatMap((issue): FieldError[] =>
    issue.code === 'unrecognized_keys'
      ? issue.keys.map((key) => ({ field: pointerTo([...issue.path, key]), code: 'UNKNOWN_FIELD' }))
      : [{ field: pointerTo(issue.path), code: 'NOT_ALLOWED_VALUE' }],
  );
}

/**
 * Parses a request part (for example `@Query(new ZodValidationPipe(NO_QUERY))`) with
 * its schema, and answers 400 VALIDATION_FAILED with field errors when it does not
 * match.
 */
export class ZodValidationPipe<Schema extends z.ZodType> implements PipeTransform<
  unknown,
  z.output<Schema>
> {
  constructor(private readonly schema: Schema) {}

  transform(value: unknown): z.output<Schema> {
    const result = this.schema.safeParse(value);
    if (result.success) {
      return result.data;
    }
    throw new ProblemException(
      400,
      'VALIDATION_FAILED',
      undefined,
      fieldErrorsOf(result.error.issues),
    );
  }
}
