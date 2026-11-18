import { describe, expect, it } from 'vitest';
import { resolveRequestId } from './request-id.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('request ID', () => {
  it('S0 request ID keeps a valid UUID from the caller', () => {
    const id = '7d1c9a52-0f3e-4b8a-9c6d-2e1f0a9b8c7d';
    expect(resolveRequestId(id)).toBe(id);
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['not a UUID', 'hello'],
    ['too long', `7d1c9a52-0f3e-4b8a-9c6d-2e1f0a9b8c7d${'0'.repeat(40)}`],
    ['a UUID with text around it', 'x7d1c9a52-0f3e-4b8a-9c6d-2e1f0a9b8c7d'],
    [
      'sent twice',
      ['7d1c9a52-0f3e-4b8a-9c6d-2e1f0a9b8c7d', '7d1c9a52-0f3e-4b8a-9c6d-2e1f0a9b8c7e'],
    ],
  ])('S0 request ID replaces a header that is %s with a new UUID', (_case, header) => {
    const id = resolveRequestId(header);
    expect(id).toMatch(UUID);
    expect(id).not.toBe(header);
  });
});
