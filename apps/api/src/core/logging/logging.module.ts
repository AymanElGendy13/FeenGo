import { Module, type DynamicModule, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import type { DestinationStream, Logger } from 'pino';
import type { AppConfigService } from '../config/config.module.js';
import { createHttpLogger, type HttpLogger } from './http-logger.js';

/** The pino-http middleware, mounted by `configureApp` in pipeline order (section 4.3). */
export const HTTP_LOGGER = Symbol('HTTP_LOGGER');
/** The application's root pino logger, for code outside a request. */
export const ROOT_LOGGER = Symbol('ROOT_LOGGER');

export interface LoggingOptions {
  /** Where log lines go. Defaults to standard output; tests capture them here. */
  logDestination?: DestinationStream;
}

/**
 * Structured logging with pino (section 4.5). The application owns its pino-http
 * middleware, so it runs before the body parser and every request, including one
 * with a rejected body, gets a request ID and a log line. nestjs-pino reuses that
 * logger (`useExisting`) for Nest's own logs and for logs inside a request.
 */
@Module({})
export class LoggingModule {
  static forRoot(options: LoggingOptions = {}): DynamicModule {
    const httpLogger: Provider = {
      provide: HTTP_LOGGER,
      inject: [ConfigService],
      useFactory: (config: AppConfigService): HttpLogger =>
        createHttpLogger(
          {
            appEnv: config.get('appEnv', { infer: true }),
            logLevel: config.get('logLevel', { infer: true }),
          },
          options.logDestination,
        ),
    };
    const rootLogger: Provider = {
      provide: ROOT_LOGGER,
      inject: [HTTP_LOGGER],
      useFactory: (http: HttpLogger): Logger => http.logger,
    };
    return {
      module: LoggingModule,
      global: true,
      imports: [
        LoggerModule.forRootAsync({
          inject: [HTTP_LOGGER],
          useFactory: (http: HttpLogger) => ({
            // wrapSerializers: false keeps this logger's own error serializer.
            pinoHttp: { logger: http.logger, wrapSerializers: false },
            useExisting: true,
          }),
        }),
      ],
      providers: [httpLogger, rootLogger],
      exports: [HTTP_LOGGER, ROOT_LOGGER],
    };
  }
}
