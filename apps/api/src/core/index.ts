// Public surface of the core module. Other modules import from here only (section 4.2).
export { APP_VERSION } from './app-version.js';
export { ConfigService, type AppConfigService } from './config/config.module.js';
export {
  ConfigValidationError,
  loadConfig,
  type AppConfig,
  type AppEnv,
  type EnvSource,
} from './config/config.schema.js';
export { CoreModule, type CoreOptions } from './core.module.js';
export { DATABASE, type Database } from './database/database.js';
export {
  buildProblem,
  ProblemException,
  type ErrorCode,
  type FieldError,
  type Problem,
} from './errors/problem.js';
export { JSON_BODY_LIMIT_BYTES } from './http/request-limits.js';
export { HTTP_LOGGER, ROOT_LOGGER } from './logging/logging.module.js';
export type { HttpLogger } from './logging/http-logger.js';
export { REDIS } from './redis/redis.js';
export { NO_QUERY, ZodValidationPipe, type NoQuery } from './validation/zod-validation.pipe.js';
