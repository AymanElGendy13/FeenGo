import type { Logger } from 'pino';
import { describe, expect, it, vi } from 'vitest';
import { closedPort } from '../../../test/support/network.js';
import { closeRedis, createRedis } from './redis.js';

describe('redis client', () => {
  it('S0 a Redis that is down from boot is logged as could not connect, not as connection lost', async () => {
    const warn = vi.fn();
    const info = vi.fn();
    const logger = { warn, info } as unknown as Logger;
    const redis = createRedis(`redis://127.0.0.1:${await closedPort()}`, logger);
    try {
      await vi.waitFor(() => expect(warn).toHaveBeenCalled());
      // Several reconnect attempts fail; only the first is logged.
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]?.[1]).toBe('redis could not connect');
      expect(info).not.toHaveBeenCalled();
    } finally {
      await closeRedis(redis);
    }
  });
});
