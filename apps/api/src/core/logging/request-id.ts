import { randomUUID } from 'node:crypto';

export const REQUEST_ID_HEADER = 'X-Request-Id';

// RFC 9562 UUID: versions 1 to 8, the standard variant.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * The request ID for a request (section 4.3, step 2): the caller's X-Request-Id if it
 * is a valid UUID, otherwise a new one. Anything else a caller sends is dropped, so
 * a request ID can never carry arbitrary text into the logs.
 */
export function resolveRequestId(header: string | string[] | undefined): string {
  return typeof header === 'string' && UUID.test(header) ? header : randomUUID();
}
