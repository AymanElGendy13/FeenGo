import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { DependencyProbes } from '../src/health/dependency-probes.js';
import { READINESS_CACHE_MS } from '../src/health/readiness.service.js';
import { createTestApp } from './support/app.js';
import { expectContractResponse, expectSchema } from './support/contract.js';
import { testEnv, withPort } from './support/env.js';
import { LogCapture } from './support/logs.js';
import { closedPort, silentServer, tcpRelay } from './support/network.js';

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

  it('S0 health rejects unknown query parameters with 400 UNKNOWN_FIELD', async () => {
    const probes = app.get(DependencyProbes);
    const database = vi.spyOn(probes, 'database');
    for (const path of ['/health', '/health/ready']) {
      const res = await request(app.getHttpServer()).get(`${path}?phone=%2B201001234567&debug=1`);
      expect(res.status).toBe(400);
      expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
      expectContractResponse(path, 'get', res);
      expect(res.body).toEqual({
        type: 'https://docs.feengo.invalid/errors/VALIDATION_FAILED',
        title: 'The request is not valid',
        status: 400,
        code: 'VALIDATION_FAILED',
        requestId: res.headers['x-request-id'],
        errors: [
          { field: '/phone', code: 'UNKNOWN_FIELD' },
          { field: '/debug', code: 'UNKNOWN_FIELD' },
        ],
      });
      // The parameter's name is reported, never its value.
      expect(res.text).not.toContain('201001234567');
    }
    // Refused before the readiness check runs.
    expect(database).not.toHaveBeenCalled();
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

describe('health when the Redis connection is lost after start-up', () => {
  const logs = new LogCapture();
  let app: NestExpressApplication;
  let relay: Awaited<ReturnType<typeof tcpRelay>>;

  beforeAll(async () => {
    const env = testEnv({ LOG_LEVEL: 'info' });
    const redisUrl = new URL(env.REDIS_URL ?? '');
    relay = await tcpRelay(redisUrl.hostname, Number(redisUrl.port || 6379));
    app = await createTestApp({
      env: { ...env, REDIS_URL: withPort(env.REDIS_URL, relay.port) },
      logDestination: logs,
    });
  });

  afterAll(async () => {
    await app.close();
    await relay.close();
  });

  it('S0 health readiness reports Redis down with 503 after its connection is lost, and 200 once it is back', async () => {
    const server = app.getHttpServer();
    const first = await request(server).get('/health/ready');
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ status: 'ok', checks: { database: 'up', redis: 'up' } });

    await relay.close();
    await new Promise((resolve) => setTimeout(resolve, READINESS_CACHE_MS + 50));
    const lost = await request(server).get('/health/ready');
    expect(lost.status).toBe(503);
    expectContractResponse('/health/ready', 'get', lost);
    expect(lost.body).toEqual({
      status: 'unavailable',
      checks: { database: 'up', redis: 'down' },
    });

    await relay.open();
    await vi.waitFor(
      async () => {
        const back = await request(server).get('/health/ready');
        expect(back.status).toBe(200);
        expect(back.body).toEqual({ status: 'ok', checks: { database: 'up', redis: 'up' } });
      },
      { timeout: 10_000, interval: 250 },
    );

    const messages = logs.entries().map((entry) => entry.msg);
    expect(messages).toContain('redis connection lost');
    expect(messages).toContain('redis connection restored');
    expect(messages).not.toContain('redis could not connect');
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
