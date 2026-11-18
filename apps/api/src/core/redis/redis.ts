import { Redis } from 'ioredis';
import type { Logger } from 'pino';

/** Injection token for the shared ioredis client. */
export const REDIS = Symbol('REDIS');

const QUIT_TIMEOUT_MS = 1_000;

/**
 * The ioredis client. It connects in the background and reconnects by itself, so
 * the API starts even while Redis is down; readiness reports it. A command sent
 * while it is still connecting waits for the connection, but fails after one failed
 * reconnect attempt (`maxRetriesPerRequest: 1`), so a request never waits long on
 * Redis.
 */
export function createRedis(redisUrl: string, logger: Logger): Redis {
  const redis = new Redis(redisUrl, {
    connectionName: 'feengo-api',
    maxRetriesPerRequest: 1,
    connectTimeout: 2_000,
  });
  // Log changes of state, not every reconnect attempt.
  let connected = true;
  redis.on('error', (err: unknown) => {
    if (connected) {
      connected = false;
      logger.warn({ err }, 'redis connection lost');
    }
  });
  redis.on('ready', () => {
    if (!connected) {
      connected = true;
      logger.info('redis connection restored');
    }
  });
  return redis;
}

/** Closes the client: QUIT when connected, otherwise (or if QUIT stalls) a hard disconnect. */
export async function closeRedis(redis: Redis): Promise<void> {
  if (redis.status !== 'ready') {
    redis.disconnect();
    return;
  }
  let timer: NodeJS.Timeout | undefined;
  // QUIT resolves when Redis acknowledges it; the connection has closed at `end`.
  const ended = new Promise<void>((resolve) => redis.once('end', () => resolve()));
  try {
    await Promise.race([
      Promise.all([redis.quit(), ended]),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('QUIT timed out')), QUIT_TIMEOUT_MS);
      }),
    ]);
  } catch {
    redis.disconnect();
  } finally {
    clearTimeout(timer);
  }
}
