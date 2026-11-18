import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Request, Response } from 'express';
import { stdTimeFunctions, type DestinationStream, type LoggerOptions } from 'pino';
import { pinoHttp, type HttpLogger, type Options } from 'pino-http';
import type { AppConfig } from '../config/config.schema.js';
import { serializeError } from './error-serializer.js';
import { REDACT_PATHS, REDACTED } from './redaction.js';
import { REQUEST_ID_HEADER, resolveRequestId } from './request-id.js';

export type { HttpLogger };

/** Key of the request ID on every log line, the same name as in the Problem body. */
export const REQUEST_ID_LOG_KEY = 'requestId';

interface MatchedRoute {
  path?: unknown;
  methods?: Record<string, unknown>;
}

/**
 * The route pattern, such as `/health/ready`, never the raw URL with its query
 * string. Each controller route is registered for exactly one HTTP method. Nest
 * mounts middleware (nestjs-pino's among them) as a route for every method, and a
 * prefixed not-found handler as an `all()` route, so a request that matched no
 * controller route may still have one of those in `req.route`. Anything that is not
 * a one-method route is reported as `null`.
 */
export function routePattern(req: Request): string | null {
  const route = req.route as MatchedRoute | undefined;
  if (typeof route?.path !== 'string' || route.methods === undefined) {
    return null;
  }
  const methods = Object.entries(route.methods).filter(([, on]) => on === true);
  if (methods.length !== 1 || methods[0]?.[0] === '_all') {
    return null;
  }
  return `${req.baseUrl}${route.path}`;
}

/**
 * The one log line per request (section 4.5): method, route pattern, status,
 * duration and request ID (bound to the logger), plus the Problem code of a failed
 * request. Never a body, a header or the raw URL. From S1 it also carries the
 * caller's subject ID.
 */
function requestLine(req: Request, res: Response, responseTime: unknown): Record<string, unknown> {
  const errorCode: unknown = res.locals.errorCode;
  return {
    method: req.method,
    route: routePattern(req),
    statusCode: res.statusCode,
    responseTime,
    ...(typeof errorCode === 'string' ? { errorCode } : {}),
  };
}

/**
 * pino-http makes up an error ("failed with status code 503") for a 5xx response
 * that no error caused, such as readiness reporting a dependency down. Its stack
 * points into pino-http and says nothing, so it is left out of the log line.
 */
function isMadeUpError(error: Error, res: ServerResponse): boolean {
  return (
    (res as ServerResponse & { err?: unknown }).err === undefined &&
    error.message === `failed with status code ${res.statusCode}`
  );
}

/**
 * Sends every Error at the top level of a log object through the error serializer,
 * whatever its key (`error`, `cause` and so on), not only `err`. pino runs this
 * before its serializers and redaction; `err` is left to its serializer.
 */
function serializeTopLevelErrors(object: Record<string, unknown>): Record<string, unknown> {
  let result = object;
  for (const [key, value] of Object.entries(object)) {
    if (key !== 'err' && value instanceof Error) {
      result = result === object ? { ...object } : result;
      result[key] = serializeError(value);
    }
  }
  return result;
}

export function loggerOptions(config: Pick<AppConfig, 'appEnv' | 'logLevel'>): LoggerOptions {
  return {
    level: config.logLevel,
    timestamp: stdTimeFunctions.isoTime,
    redact: { paths: [...REDACT_PATHS], censor: REDACTED },
    serializers: { err: serializeError },
    formatters: { log: serializeTopLevelErrors },
    // Readable local logs only; every other environment writes JSON lines.
    ...(config.appEnv === 'local'
      ? { transport: { target: 'pino-pretty', options: { singleLine: true } } }
      : {}),
  };
}

/**
 * The request logger middleware, and through `.logger` the root logger of the
 * application. `destination` lets tests capture every line; it is ignored locally,
 * where pino-pretty writes to the terminal.
 */
export function createHttpLogger(
  config: Pick<AppConfig, 'appEnv' | 'logLevel'>,
  destination?: DestinationStream,
): HttpLogger {
  const options: Options<IncomingMessage, ServerResponse> = {
    ...loggerOptions(config),
    // Serializers are used as given: no req or res serializer, because neither
    // object is ever logged.
    wrapSerializers: false,
    customAttributeKeys: { reqId: REQUEST_ID_LOG_KEY },
    genReqId: (req, res) => {
      const id = resolveRequestId(req.headers[REQUEST_ID_HEADER.toLowerCase()]);
      res.setHeader(REQUEST_ID_HEADER, id);
      return id;
    },
    // Every line inside a request carries only the request ID, not the request.
    quietReqLogger: true,
    quietResLogger: true,
    customLogLevel: (_req, res, err) => {
      if (err !== undefined || res.statusCode >= 500) {
        return 'error';
      }
      return res.statusCode >= 400 ? 'warn' : 'info';
    },
    customSuccessMessage: () => 'request completed',
    customErrorMessage: () => 'request failed',
    customSuccessObject: (req, res, value: { responseTime?: unknown }) =>
      requestLine(req as Request, res as Response, value.responseTime),
    customErrorObject: (req, res, error, value: { responseTime?: unknown }) => ({
      ...requestLine(req as Request, res as Response, value.responseTime),
      ...(isMadeUpError(error, res) ? {} : { err: error }),
    }),
  };
  if (config.appEnv === 'local' || destination === undefined) {
    return pinoHttp(options);
  }
  return pinoHttp(options, destination);
}
