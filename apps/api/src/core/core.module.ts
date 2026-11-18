import { Global, Module, type DynamicModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { Logger } from 'pino';
import { configModule, type AppConfigService, type ConfigOptions } from './config/config.module.js';
import { ConnectionsLifecycle } from './connections.lifecycle.js';
import { createDatabase, DATABASE } from './database/database.js';
import { ProblemFilter } from './errors/problem.filter.js';
import { LoggingModule, ROOT_LOGGER, type LoggingOptions } from './logging/logging.module.js';
import { createRedis, REDIS } from './redis/redis.js';

export type CoreOptions = ConfigOptions & LoggingOptions;

/**
 * Configuration, logging, the database and Redis clients and the Problem filter
 * (section 4.2). Global, so feature modules inject REDIS, and their own narrowed
 * database through `moduleDatabaseProvider`, without importing it.
 */
@Global()
@Module({})
export class CoreModule {
  static forRoot(options: CoreOptions = {}): DynamicModule {
    return {
      module: CoreModule,
      imports: [
        configModule(options),
        LoggingModule.forRoot(
          options.logDestination === undefined ? {} : { logDestination: options.logDestination },
        ),
      ],
      providers: [
        {
          provide: DATABASE,
          inject: [ConfigService, ROOT_LOGGER],
          useFactory: (config: AppConfigService, logger: Logger) =>
            createDatabase(
              config.get('databaseUrl', { infer: true }),
              logger.child({ context: 'Database' }),
            ),
        },
        {
          provide: REDIS,
          inject: [ConfigService, ROOT_LOGGER],
          useFactory: (config: AppConfigService, logger: Logger) =>
            createRedis(
              config.get('redisUrl', { infer: true }),
              logger.child({ context: 'Redis' }),
            ),
        },
        ConnectionsLifecycle,
        { provide: APP_FILTER, useClass: ProblemFilter },
      ],
      exports: [DATABASE, REDIS],
    };
  }
}
