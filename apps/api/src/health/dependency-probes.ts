import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { sql, type Kysely } from 'kysely';
import { DATABASE, REDIS, type Database } from '../core/index.js';

/** One round trip to each dependency. Each resolves when it is up and rejects otherwise. */
@Injectable()
export class DependencyProbes {
  constructor(
    @Inject(DATABASE) private readonly db: Kysely<Database>,
    @Inject(REDIS) private readonly redisClient: Redis,
  ) {}

  async database(): Promise<void> {
    await sql`select 1`.execute(this.db);
  }

  async redis(): Promise<void> {
    const reply = await this.redisClient.ping();
    if (reply !== 'PONG') {
      throw new Error('Redis answered PING with an unexpected reply');
    }
  }
}
