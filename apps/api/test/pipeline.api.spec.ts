import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './support/app.js';
import { expectSchema } from './support/contract.js';
import { testEnv } from './support/env.js';
import { PLANTED, TestController } from './support/test.controller.js';

// The S0 request pipeline (docs/ARCHITECTURE.md section 4.3).

describe('request pipeline', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp({ controllers: [TestController] });
  });

  afterAll(async () => {
    await app.close();
  });

  it('Q-05 responses carry Helmet security headers and no X-Powered-By', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toContain('max-age=');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('Q-05 the API sends no CORS headers to a cross-origin caller', async () => {
    const server = app.getHttpServer();
    const simple = await request(server).get('/health').set('Origin', 'https://elsewhere.example');
    const preflight = await request(server)
      .options('/health')
      .set('Origin', 'https://elsewhere.example')
      .set('Access-Control-Request-Method', 'GET');
    for (const res of [simple, preflight]) {
      const corsHeaders = Object.keys(res.headers).filter((h) => h.startsWith('access-control-'));
      expect(corsHeaders).toEqual([]);
    }
  });

  it('S0 a JSON body of up to 64 KB is accepted', async () => {
    const body = { filler: 'x'.repeat(64 * 1024 - 20) };
    expect(JSON.stringify(body).length).toBeLessThanOrEqual(64 * 1024);
    const res = await request(app.getHttpServer()).post('/test/echo').send(body);
    expect(res.status).toBe(200);
  });

  it('S0 a JSON body over 64 KB is refused with a 413 Problem', async () => {
    const res = await request(app.getHttpServer())
      .post('/test/echo')
      .send({ filler: 'x'.repeat(64 * 1024) });
    expect(res.status).toBe(413);
    expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
    expectSchema('Problem', res.body);
    expect(res.body).toMatchObject({ status: 413, code: 'VALIDATION_FAILED' });
    expect(res.body.requestId).toBe(res.headers['x-request-id']);
  });

  it('S0 malformed JSON gives a 400 VALIDATION_FAILED Problem', async () => {
    const res = await request(app.getHttpServer())
      .post('/test/echo')
      .set('Content-Type', 'application/json')
      .send('{"phone": "+2010');
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
    expectSchema('Problem', res.body);
    expect(res.body).toMatchObject({ status: 400, code: 'VALIDATION_FAILED' });
    expect(res.text).not.toContain('+2010');
  });

  it('S0 an unexpected error gives a 500 INTERNAL_ERROR Problem with no stack trace', async () => {
    const res = await request(app.getHttpServer()).get('/test/planted-failure');
    expect(res.status).toBe(500);
    expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
    expectSchema('Problem', res.body);
    expect(res.body).toEqual({
      type: 'https://docs.feengo.invalid/errors/INTERNAL_ERROR',
      title: 'Internal error',
      status: 500,
      code: 'INTERNAL_ERROR',
      requestId: res.headers['x-request-id'],
    });
    for (const leak of [
      'the planted failure',
      'PlantedFailure',
      ' at ',
      PLANTED.name,
      PLANTED.code,
    ]) {
      expect(res.text).not.toContain(leak);
    }
  });

  it('S0 a Problem raised on purpose keeps its status and code', async () => {
    const res = await request(app.getHttpServer()).get('/test/unavailable');
    expect(res.status).toBe(503);
    expectSchema('Problem', res.body);
    expect(res.body).toMatchObject({ status: 503, code: 'SERVICE_UNAVAILABLE' });
  });

  it('S0 TRUST_PROXY=0 ignores X-Forwarded-For', async () => {
    const res = await request(app.getHttpServer())
      .get('/test/ip')
      .set('X-Forwarded-For', '203.0.113.7');
    expect(res.body.ip).not.toBe('203.0.113.7');
  });
});

describe('request pipeline behind one proxy', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp({
      env: testEnv({ TRUST_PROXY: '1' }),
      controllers: [TestController],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('S0 TRUST_PROXY=1 takes the client IP from the last X-Forwarded-For hop only', async () => {
    const res = await request(app.getHttpServer())
      .get('/test/ip')
      .set('X-Forwarded-For', '198.51.100.9, 203.0.113.7');
    expect(res.body.ip).toBe('203.0.113.7');
  });
});
