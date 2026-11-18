import { Catch, HttpException, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { JSON_BODY_LIMIT_BYTES } from '../http/request-limits.js';
import { REQUEST_ID_HEADER } from '../logging/request-id.js';
import { buildProblem, ProblemException, PROBLEM_CONTENT_TYPE, type ErrorCode } from './problem.js';

interface ProblemParts {
  status: number;
  code: ErrorCode;
  detail?: string;
}

// Codes for errors raised by the framework itself rather than by FeenGo code, such as
// an unknown route (404) or a body the JSON parser refused (400, 413). The framework's
// own messages are never passed on: they can echo the request path.
const STATUS_CODES: Readonly<Record<number, ErrorCode>> = {
  400: 'VALIDATION_FAILED',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  429: 'RATE_LIMITED',
  503: 'SERVICE_UNAVAILABLE',
};

const STATUS_DETAILS: Readonly<Record<number, string>> = {
  404: 'No endpoint matches this method and path.',
  413: `The request body is larger than ${JSON_BODY_LIMIT_BYTES / 1024} KB.`,
};

function toProblemParts(exception: unknown): ProblemParts {
  if (exception instanceof ProblemException) {
    return {
      status: exception.status,
      code: exception.errorCode,
      ...(exception.detail === undefined ? {} : { detail: exception.detail }),
    };
  }
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const code = STATUS_CODES[status];
    const detail = STATUS_DETAILS[status];
    if (code !== undefined) {
      return { status, code, ...(detail === undefined ? {} : { detail }) };
    }
    if (status >= 400 && status < 500) {
      // Any other client error (413, 415 and so on) means the request does not
      // match the contract.
      return {
        status,
        code: 'VALIDATION_FAILED',
        ...(detail === undefined ? {} : { detail }),
      };
    }
  }
  return { status: 500, code: 'INTERNAL_ERROR' };
}

/**
 * Turns every error into an RFC 9457 Problem response (section 4.3, step 10). Nothing
 * from an unexpected error reaches the response: no message and no stack trace. The
 * error itself is handed to the request logger, which writes it with the redacting
 * error serializer.
 */
@Catch()
export class ProblemFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const { status, code, detail } = toProblemParts(exception);

    // Read by the request log line (section 4.5): `errorCode` on every failure, and
    // the error itself for server faults.
    res.locals.errorCode = code;
    if (status >= 500) {
      res.err =
        exception instanceof Error
          ? exception
          : new Error('A value that is not an Error was thrown.');
    }
    if (res.headersSent) {
      return;
    }

    const requestId = String(req.id ?? res.getHeader(REQUEST_ID_HEADER) ?? '');
    res
      .status(status)
      .type(PROBLEM_CONTENT_TYPE)
      .send(JSON.stringify(buildProblem(status, code, requestId, detail)));
  }
}
