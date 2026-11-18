import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule, type AppModuleOptions } from './app.module.js';
import {
  ConfigService,
  HTTP_LOGGER,
  JSON_BODY_LIMIT_BYTES,
  type AppConfigService,
  type HttpLogger,
} from './core/index.js';

/**
 * Options for NestFactory.create and Test's createNestApplication. Nest's own body
 * parser is off, so `configureApp` can mount the JSON parser after the request
 * logger.
 */
export const NEST_APP_OPTIONS = {
  bufferLogs: true,
  bodyParser: false,
  abortOnError: false,
} as const;

/**
 * The request pipeline, in the order of docs/ARCHITECTURE.md section 4.3 (the S0
 * steps): Helmet, request ID and logging, the 64 KB JSON body limit. The Problem
 * filter is registered as a global filter by CoreModule. No CORS: the API refuses
 * cross-origin browser calls.
 */
export function configureApp(app: NestExpressApplication): NestExpressApplication {
  const config = app.get<AppConfigService>(ConfigService);
  app.useLogger(app.get(Logger));
  app.disable('x-powered-by');
  // Client IP from X-Forwarded-For, trusting only TRUST_PROXY hops (section 4.6).
  app.set('trust proxy', config.get('trustProxy', { infer: true }));
  app.use(helmet());
  // Gives each request its ID (X-Request-Id) and writes the request log line.
  app.use(app.get<HttpLogger>(HTTP_LOGGER));
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT_BYTES });
  app.enableShutdownHooks();
  return app;
}

/** Creates the configured application. Throws ConfigValidationError on a bad environment. */
export async function createApp(options: AppModuleOptions = {}): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule.forRoot(options),
    NEST_APP_OPTIONS,
  );
  return configureApp(app);
}
