import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { DependencyProbes } from '../src/health/dependency-probes.js';
import { READINESS_CACHE_MS } from '../src/health/readiness.service.js';
import { createTestApp } from './support/app.js';
import { expectContractResponse, expectSchema } from './support/contract.js';
import { testEnv, withPort } from './support/env.js';
import { closedPort, silentServer } from './support/network.js';

// API tests against the real Compose Postgres and Redis (docker compose up -d --wait).
// "Down" is a test app pointed at a port nothing listens on, or at a server that
// accepts connections and never answers, so no container is stopped.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('health with both dependencies up', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('S0 health liveness returns 200 and matches Liveness', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^application\/json/);
    expectContractResponse('/health', 'get', res);
    expect(res.body).toMatchObject({ status: 'ok', version: '0.1.0' });
    expect(Math.abs(Date.parse(res.body.time) - Date.now())).toBeLessThan(5_000);
  });

  it('S0 health readiness returns 200 with the database and Redis up', async () => {
    // A fresh check, not a result cached by an earlier test.
    await new Promise((resolve) => setTimeout(resolve, READINESS_CACHE_MS + 50));
    const res = await request(app.getHttpServer()).get('/health/ready');
    expect(res.status).toBe(200);
    expectContractResponse('/health/ready', 'get', res);
    expect(res.body).toEqual({ status: 'ok', checks: { database: 'up', redis: 'up' } });
  });

  it('S0 health readiness result is cached for 1 second', async () => {
    const probes = app.get(DependencyProbes);
    await new Promise((resolve) => setTimeout(resolve, READINESS_CACHE_MS + 50));
    const database = vi.spyOn(probes, 'database');
    const redis = vi.spyOn(probes, 'redis');
    const server = app.getHttpServer();

    // Concurrent requests share one check, and later ones within the second reuse it.
    const first = await Promise.all([
      request(server).get('/health/ready'),
      request(server).get('/health/ready'),
      request(server).get('/health/ready'),
    ]);
    const again = await request(server).get('/health/ready');
    for (const res of [...first, again]) {
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', checks: { database: 'up', redis: 'up' } });
    }
    expect(database).toHaveBeenCalledTimes(1);
    expect(redis).toHaveBeenCalledTimes(1);

    // After the second has passed, the next request checks again.
    await new Promise((resolve) => setTimeout(resolve, READINESS_CACHE_MS + 50));
    const later = await request(server).get('/health/ready');
    expect(later.status).toBe(200);
    expect(database).toHaveBeenCalledTimes(2);
    expect(redis).toHaveBeenCalledTimes(2);
  });

  it('S0 request ID echoes a valid X-Request-Id', async () => {
    const id = '7d1c9a52-0f3e-4b8a-9c6d-2e1f0a9b8c7d';
    const res = await request(app.getHttpServer()).get('/health').set('X-Request-Id', id);
    expect(res.headers['x-request-id']).toBe(id);
  });

  it('S0 request ID replaces an invalid X-Request-Id with a new UUID', async () => {
    const res = await request(app.getHttpServer())
      .get('/health')
      .set('X-Request-Id', 'not-a-uuid <script>');
    expect(res.headers['x-request-id']).toMatch(UUID);
  });

  it('S0 request ID is set when the caller sends none', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.headers['x-request-id']).toMatch(UUID);
  });

  it('S0 unknown route gives a 404 Problem', async () => {
    const res = await request(app.getHttpServer()).get('/v1/nothing-here?phone=%2B201000000000');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
    expectSchema('Problem', res.body);
    expect(res.body).toEqual({
      type: 'https://docs.feengo.invalid/errors/NOT_FOUND',
      title: 'Not found',
      status: 404,
      code: 'NOT_FOUND',
      detail: 'No endpoint matches this method and path.',
      requestId: res.headers['x-request-id'],
    });
    // The framework's message would echo the path; it is not passed on.
    expect(res.text).not.toContain('nothing-here');
  });

  it('S0 health routes are unversioned', async () => {
    const res = await request(app.getHttpServer()).get('/v1/health');
    expect(res.status).toBe(404);
  });
});

describe('health with Redis unreachable', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const env = testEnv();
    app = await createTestApp({
      env: { ...env, REDIS_URL: withPort(env.REDIS_URL, await closedPort()) },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('S0 health readiness reports Redis down with 503', async () => {
    const res = await request(app.getHttpServer()).get('/health/ready');
    expect(res.status).toBe(503);
    expectContractResponse('/health/ready', 'get', res);
    expect(res.body).toEqual({
      status: 'unavailable',
      checks: { database: 'up', redis: 'down' },
    });
  });

  it('S0 health liveness stays 200 while Redis is down', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expectContractResponse('/health', 'get', res);
  });
});

describe('health with the database unreachable', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const env = testEnv();
    app = await createTestApp({
      env: { ...env, DATABASE_URL: withPort(env.DATABASE_URL, await closedPort()) },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('S0 health readiness reports the database down with 503', async () => {
    const res = await request(app.getHttpServer()).get('/health/ready');
    expect(res.status).toBe(503);
    expectContractResponse('/health/ready', 'get', res);
    expect(res.body).toEqual({
      status: 'unavailable',
      checks: { database: 'down', redis: 'up' },
    });
  });

  it('S0 health liveness never touches the database or Redis', async () => {
    const probes = app.get(DependencyProbes);
    const database = vi.spyOn(probes, 'database');
    const redis = vi.spyOn(probes, 'redis');
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(database).not.toHaveBeenCalled();
    expect(redis).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});

describe('health with dependencies that never answer', () => {
  let app: NestExpressApplication;
  let database: Awaited<ReturnType<typeof silentServer>>;
  let redis: Awaited<ReturnType<typeof silentServer>>;

  beforeAll(async () => {
    database = await silentServer();
    redis = await silentServer();
    const env = testEnv();
    app = await createTestApp({
      env: {
        ...env,
        DATABASE_URL: withPort(env.DATABASE_URL, database.port),
        REDIS_URL: withPort(env.REDIS_URL, redis.port),
      },
    });
  });

  afterAll(async () => {
    await app.close();
    await database.close();
    await redis.close();
  });

  it('S0 health readiness gives up on each dependency after 1 second, checking both at once', async () => {
    const started = Date.now();
    const res = await request(app.getHttpServer()).get('/health/ready');
    const elapsed = Date.now() - started;
    expect(res.status).toBe(503);
    expectContractResponse('/health/ready', 'get', res);
    expect(res.body).toEqual({
      status: 'unavailable',
      checks: { database: 'down', redis: 'down' },
    });
    // Both checks time out together, so the answer comes after about 1 second, not 2.
    expect(elapsed).toBeGreaterThanOrEqual(900);
    expect(elapsed).toBeLessThan(1_900);
  });
});
