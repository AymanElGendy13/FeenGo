import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { sql } from 'kysely';
import { REDIS } from '../core/index.js';
import { HEALTH_DATABASE, type HealthDatabase } from './health.database.js';

/** One round trip to each dependency. Each resolves when it is up and rejects otherwise. */
@Injectable()
export class DependencyProbes {
  constructor(
    @Inject(HEALTH_DATABASE) private readonly db: HealthDatabase,
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
