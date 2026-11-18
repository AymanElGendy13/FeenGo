import { ConfigModule, ConfigService } from '@nestjs/config';
import type { DynamicModule } from '@nestjs/common';
import { loadConfig, type AppConfig, type EnvSource } from './config.schema.js';

/** The typed configuration service: `config.get('databaseUrl', { infer: true })`. */
export type AppConfigService = ConfigService<AppConfig, true>;
export { ConfigService };

export interface ConfigOptions {
  /** Where to read variables from. Defaults to `process.env`; tests pass their own. */
  env?: EnvSource;
}

/**
 * Loads and validates the configuration once, when the application is created.
 * An invalid environment makes the factory throw ConfigValidationError, so the
 * application never starts. ConfigService serves only the validated values: no
 * .env file is read here and raw process.env is never exposed.
 */
export function configModule(options: ConfigOptions = {}): Promise<DynamicModule> {
  return ConfigModule.forRoot({
    isGlobal: true,
    cache: true,
    ignoreEnvFile: true,
    validatePredefined: false,
    skipProcessEnv: true,
    load: [() => loadConfig(options.env ?? process.env)],
  });
}
