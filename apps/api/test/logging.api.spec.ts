import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp } from './support/app.js';
import { testEnv } from './support/env.js';
import { LogCapture } from './support/logs.js';
import { PLANTED, TestController } from './support/test.controller.js';

// Logging and redaction (docs/ARCHITECTURE.md section 4.5). Every log line the
// application writes is captured, at the most verbose level, together with anything
// written straight to stdout or stderr.

const KNOWN = {
  token: 'eyJhbGciOiJFZERTQSJ9.known-access-token.c2lnbmF0dXJl',
  refreshToken: 'frt_known-refresh-token-5b7e',
  cookie: 'known-session-cookie-8c3d',
  forwardingKey: 'known-forwarding-key-1f9a',
  phone: '+201001234567',
  code: '482915',
  email: 'known.person@example.com',
  name: 'Known Person Name',
} as const;

describe('logging', () => {
  const logs = new LogCapture();
  const written: string[] = [];
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp({
      env: testEnv({ LOG_LEVEL: 'trace' }),
      logDestination: logs,
      controllers: [TestController],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    logs.clear();
    written.length = 0;
    for (const stream of [process.stdout, process.stderr]) {
      const write = stream.write.bind(stream);
      vi.spyOn(stream, 'write').mockImplementation(((chunk: unknown, ...rest: never[]) => {
        written.push(String(chunk));
        return write(chunk as string, ...rest);
      }) as typeof stream.write);
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Every request log line (the one written when a response finishes). */
  function requestLines(): Record<string, unknown>[] {
    return logs.entries().filter((entry) => 'statusCode' in entry && 'responseTime' in entry);
  }

  async function waitForRequestLines(count: number): Promise<void> {
    await vi.waitFor(() => expect(requestLines()).toHaveLength(count));
  }

  it('S0 the request log line holds method, route pattern, status, duration and request ID', async () => {
    const res = await request(app.getHttpServer()).get('/health?phone=%2B201001234567');
    await waitForRequestLines(1);
    const [line] = requestLines();
    expect(line).toMatchObject({
      level: 30,
      msg: 'request completed',
      requestId: res.headers['x-request-id'],
      method: 'GET',
      route: '/health',
      statusCode: 200,
    });
    expect(line?.responseTime).toBeTypeOf('number');
    expect(line).not.toHaveProperty('errorCode');
    // Never the raw URL, headers or a body.
    expect(JSON.stringify(line)).not.toContain('phone');
    for (const key of ['req', 'res', 'url', 'headers', 'body']) {
      expect(line).not.toHaveProperty(key);
    }
  });

  it('S0 the request log line of a failed request carries its errorCode', async () => {
    const res = await request(app.getHttpServer()).get('/v1/nothing-here');
    await waitForRequestLines(1);
    expect(requestLines()[0]).toMatchObject({
      level: 40,
      requestId: res.headers['x-request-id'],
      method: 'GET',
      route: null,
      statusCode: 404,
      errorCode: 'NOT_FOUND',
    });
  });

  it('S0 a 5xx response that no error caused is logged without a made-up error', async () => {
    const res = await request(app.getHttpServer()).get('/test/plain-503');
    await waitForRequestLines(1);
    const line = requestLines()[0];
    expect(line).toMatchObject({
      level: 50,
      requestId: res.headers['x-request-id'],
      route: '/test/plain-503',
      statusCode: 503,
    });
    expect(line).not.toHaveProperty('err');
  });

  it('S0 every log line inside a request carries the request ID', async () => {
    const res = await request(app.getHttpServer())
      .post('/test/careless-log')
      .send({ phone: KNOWN.phone });
    await waitForRequestLines(1);
    const inside = logs.entries().filter((entry) => entry.msg === 'careless log call');
    expect(inside).toHaveLength(1);
    expect(inside[0]?.requestId).toBe(res.headers['x-request-id']);
  });

  it('Q-05 logs never contain a known code, token or phone number', async () => {
    const server = app.getHttpServer();
    const headers = {
      Authorization: `Bearer ${KNOWN.token}`,
      Cookie: `feengo_session=${KNOWN.cookie}`,
      'X-FeenGo-Forwarding-Key': KNOWN.forwardingKey,
      'X-FeenGo-Client-IP': '198.51.100.20',
    };
    const body = {
      phone: KNOWN.phone,
      code: KNOWN.code,
      token: KNOWN.token,
      refreshToken: KNOWN.refreshToken,
      email: KNOWN.email,
      name: KNOWN.name,
    };
    const query = `phone=${encodeURIComponent(KNOWN.phone)}&code=${KNOWN.code}&token=${KNOWN.token}`;

    const responses = await Promise.all([
      request(server).get('/health').set(headers),
      request(server).get(`/health/ready?${query}`).set(headers),
      // Sign-in shaped requests to routes that do not exist yet (S1).
      request(server).post('/v1/auth/otp/request').set(headers).send(body),
      request(server).post('/v1/auth/otp/verify').set(headers).send(body),
      request(server).post(`/v1/auth/refresh?${query}`).set(headers).send(body),
      // A body the parser refuses, and one over the size limit.
      request(server)
        .post('/test/echo')
        .set(headers)
        .set('Content-Type', 'application/json')
        .send(`{"phone":"${KNOWN.phone}","code":"${KNOWN.code}"`),
      request(server)
        .post('/test/echo')
        .set(headers)
        .send({ ...body, filler: 'x'.repeat(64 * 1024) }),
      // A log call inside a request that passes personal data by mistake.
      request(server).post('/test/careless-log').set(headers).send(body),
      // A server fault.
      request(server).get('/test/planted-failure').set(headers),
    ]);
    await waitForRequestLines(responses.length);

    // Not vacuous: one request line per request, each with its own request ID.
    const ids = requestLines().map((line) => line.requestId);
    expect(new Set(ids)).toEqual(new Set(responses.map((res) => res.headers['x-request-id'])));
    // The careless log call was written, with its personal data redacted.
    const careless = logs.entries().find((entry) => entry.msg === 'careless log call');
    expect(careless).toMatchObject({
      phone: '[Redacted]',
      code: '[Redacted]',
      accessToken: '[Redacted]',
      refreshToken: '[Redacted]',
      customer: {
        phone: '[Redacted]',
        email: '[Redacted]',
        name: '[Redacted]',
        phone_e164: '[Redacted]',
      },
    });

    const everything = [...logs.lines, ...written].join('\n');
    expect(everything.length).toBeGreaterThan(0);
    for (const [label, value] of Object.entries(KNOWN)) {
      expect(everything, `${label} appears in the logs`).not.toContain(value);
    }
    // The phone number in any common shape, and the code in the URL-encoded query.
    expect(everything).not.toContain(KNOWN.phone.slice(1));
    expect(everything).not.toContain(encodeURIComponent(KNOWN.phone));
  });

  it('Q-05 error codes survive redaction', async () => {
    const failure = await request(app.getHttpServer()).get('/test/planted-failure');
    const problem = await request(app.getHttpServer()).get('/test/unavailable');
    await waitForRequestLines(2);

    const [failureLine, problemLine] = [failure, problem].map((res) =>
      requestLines().find((line) => line.requestId === res.headers['x-request-id']),
    );
    expect(failureLine).toMatchObject({
      level: 50,
      msg: 'request failed',
      statusCode: 500,
      errorCode: 'INTERNAL_ERROR',
      err: {
        errorType: 'PlantedFailure',
        errorCode: 'PLANTED_FAILURE',
        message: 'the planted failure',
      },
    });
    expect((failureLine?.err as { stack?: unknown }).stack).toMatch(/^PlantedFailure: /);
    expect(problemLine).toMatchObject({
      statusCode: 503,
      errorCode: 'SERVICE_UNAVAILABLE',
      err: { errorType: 'ProblemException', errorCode: 'SERVICE_UNAVAILABLE' },
    });

    // The planted name, code and database detail appear nowhere.
    const everything = [...logs.lines, ...written].join('\n');
    expect(everything).not.toContain(PLANTED.name);
    expect(everything).not.toContain(PLANTED.code);
    expect(everything).not.toContain(PLANTED.detail);
    expect(everything).not.toContain('[Redacted]');
    expect(Object.keys(failureLine?.err as object).sort()).toEqual([
      'errorCode',
      'errorType',
      'message',
      'stack',
    ]);
  });
});
