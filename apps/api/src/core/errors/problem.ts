// RFC 9457 problem details, the one error shape of the API (docs/api/openapi.yaml,
// components.schemas.Problem). Clients translate `code`; `title` and `detail` are
// English text for developers and are never shown to users.

/**
 * The error codes used so far. Each one is in the contract's `ErrorCode` list; S1
 * adds its own codes here as it builds the endpoints that return them.
 */
export const ERROR_CODES = [
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'RATE_LIMITED',
  'NOT_FOUND',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const PROBLEM_CONTENT_TYPE = 'application/problem+json';
export const PROBLEM_TYPE_BASE = 'https://docs.feengo.invalid/errors/';

const TITLES: Record<ErrorCode, string> = {
  VALIDATION_FAILED: 'The request is not valid',
  UNAUTHENTICATED: 'Not signed in',
  FORBIDDEN: 'Not allowed',
  RATE_LIMITED: 'Too many requests',
  NOT_FOUND: 'Not found',
  INTERNAL_ERROR: 'Internal error',
  SERVICE_UNAVAILABLE: 'Service unavailable',
};

export interface Problem {
  type: string;
  title: string;
  status: number;
  code: ErrorCode;
  detail?: string;
  requestId: string;
}

/**
 * An error the API returns on purpose. `errorCode` (not `code`) carries the Problem
 * code, so it survives log redaction of `*.code` (section 4.5).
 */
export class ProblemException extends Error {
  constructor(
    readonly status: number,
    readonly errorCode: ErrorCode,
    readonly detail?: string,
  ) {
    super(detail ?? TITLES[errorCode]);
    this.name = 'ProblemException';
  }
}

export function buildProblem(
  status: number,
  code: ErrorCode,
  requestId: string,
  detail?: string,
): Problem {
  return {
    type: `${PROBLEM_TYPE_BASE}${code}`,
    title: TITLES[code],
    status,
    code,
    ...(detail === undefined ? {} : { detail }),
    requestId,
  };
}
