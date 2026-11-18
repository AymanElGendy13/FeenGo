import { Module, type DynamicModule } from '@nestjs/common';
import { CoreModule, type CoreOptions } from './core/index.js';
import { HealthModule } from './health/index.js';

export type AppModuleOptions = CoreOptions;

@Module({})
export class AppModule {
  /** The whole API. Tests pass their own environment and log destination. */
  static forRoot(options: AppModuleOptions = {}): DynamicModule {
    return {
      module: AppModule,
      imports: [CoreModule.forRoot(options), HealthModule],
    };
  }
}
