import type { Type } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { DestinationStream } from 'pino';
import { configureApp, NEST_APP_OPTIONS } from '../../src/app.factory.js';
import { AppModule } from '../../src/app.module.js';
import type { EnvSource } from '../../src/core/index.js';
import { testEnv } from './env.js';

export interface TestAppOptions {
  env?: EnvSource;
  logDestination?: DestinationStream;
  /** Extra controllers that exist only in the test, for example to throw an error. */
  controllers?: Type[];
}

/** The real application with the real pipeline, ready for supertest. */
export async function createTestApp(options: TestAppOptions = {}): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      AppModule.forRoot({
        env: options.env ?? testEnv(),
        ...(options.logDestination === undefined ? {} : { logDestination: options.logDestination }),
      }),
    ],
    controllers: options.controllers ?? [],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>(NEST_APP_OPTIONS);
  configureApp(app);
  await app.init();
  return app;
}
