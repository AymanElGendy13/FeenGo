import type { Redis } from 'ioredis';
import type { Kysely } from 'kysely';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { DATABASE, REDIS, type Database } from '../src/core/index.js';
import { createTestApp } from './support/app.js';

describe('shutdown', () => {
  it('S0 shutdown closes the database pool and the Redis client', async () => {
    const app = await createTestApp();
    // Use both connections first, through readiness.
    expect((await request(app.getHttpServer()).get('/health/ready')).status).toBe(200);
    const db = app.get<Kysely<Database>>(DATABASE);
    const redis = app.get<Redis>(REDIS);
    const destroy = vi.spyOn(db, 'destroy');
    expect(redis.status).toBe('ready');

    await app.close();

    expect(destroy).toHaveBeenCalledTimes(1);
    expect(redis.status).toBe('end');
  });
});
