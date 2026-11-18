import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { Redis } from 'ioredis';
import { DATABASE, type Database } from './database/database.js';
import { closeRedis, REDIS } from './redis/redis.js';

/** Closes the database pool and the Redis client when the application shuts down. */
@Injectable()
export class ConnectionsLifecycle implements OnApplicationShutdown {
  constructor(
    @Inject(DATABASE) private readonly db: Kysely<Database>,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    await Promise.allSettled([this.db.destroy(), closeRedis(this.redis)]);
  }
}
