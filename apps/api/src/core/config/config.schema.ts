import { z } from 'zod';

// Environment configuration for the API (docs/ARCHITECTURE.md section 19.2). The API
// reads only environment variables, validates them here at start-up, and refuses to
// start if one is missing or wrong. Error messages name the variable and what it
// must be, and never include the value, which may be a secret (a password in
// DATABASE_URL, for example).

export const APP_ENVS = ['local', 'test', 'staging', 'production'] as const;
export type AppEnv = (typeof APP_ENVS)[number];

export const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

const MAX_TRUST_PROXY_HOPS = 10;

const wholeNumber = (min: number, max: number) =>
  z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(min).max(max));

const urlWithScheme = (protocols: readonly string[]) =>
  z.string().refine((value) => {
    try {
      return protocols.includes(new URL(value).protocol);
    } catch {
      return false;
    }
  });

const envSchema = z.object({
  APP_ENV: z.enum(APP_ENVS),
  PORT: wholeNumber(1, 65_535),
  LOG_LEVEL: z.enum(LOG_LEVELS),
  TRUST_PROXY: wholeNumber(0, MAX_TRUST_PROXY_HOPS),
  DATABASE_URL: urlWithScheme(['postgres:', 'postgresql:']),
  REDIS_URL: urlWithScheme(['redis:', 'rediss:']),
});

type EnvKey = keyof z.input<typeof envSchema>;

// What each variable must be, written out by hand so that a message never echoes
// zod's own text, which could one day include the received value.
const REQUIREMENTS: Record<EnvKey, string> = {
  APP_ENV: `one of ${APP_ENVS.join(', ')}`,
  PORT: 'a whole number from 1 to 65535',
  LOG_LEVEL: `one of ${LOG_LEVELS.join(', ')}`,
  TRUST_PROXY: `the number of trusted proxy hops, a whole number from 0 to ${MAX_TRUST_PROXY_HOPS}`,
  DATABASE_URL: 'a postgres:// or postgresql:// URL',
  REDIS_URL: 'a redis:// or rediss:// URL',
};

const ENV_KEYS = Object.keys(REQUIREMENTS) as EnvKey[];

// A type alias rather than an interface, so it fits @nestjs/config's ConfigObject.
export type AppConfig = {
  appEnv: AppEnv;
  port: number;
  logLevel: LogLevel;
  /** Number of proxy hops whose X-Forwarded-For entries are trusted (section 4.6). */
  trustProxy: number;
  /** Connection string for the `feengo_app` role (section 5.1). */
  databaseUrl: string;
  redisUrl: string;
};

export type EnvSource = Readonly<Record<string, string | undefined>>;

/** Thrown when the environment is missing a variable or holds an invalid one. */
export class ConfigValidationError extends Error {
  readonly variables: readonly string[];

  constructor(problems: readonly { key: string; missing: boolean }[]) {
    const lines = problems.map(({ key, missing }) => {
      const requirement = REQUIREMENTS[key as EnvKey];
      return missing
        ? `  - ${key} is missing; set it to ${requirement}.`
        : `  - ${key} is invalid; it must be ${requirement}.`;
    });
    super(`The API cannot start because its configuration is not valid:\n${lines.join('\n')}`);
    this.name = 'ConfigValidationError';
    this.variables = problems.map(({ key }) => key);
  }
}

/** Validates the environment and returns the typed configuration, or throws ConfigValidationError. */
export function loadConfig(env: EnvSource): AppConfig {
  // Empty strings count as missing, so `PORT=` in a .env file is reported clearly.
  const input = Object.fromEntries(
    ENV_KEYS.map((key) => [key, env[key] === '' ? undefined : env[key]]),
  );
  const result = envSchema.safeParse(input);
  if (!result.success) {
    const failed = new Set(
      result.error.issues
        .map((issue) => issue.path[0])
        .filter((key): key is EnvKey => ENV_KEYS.includes(key as EnvKey)),
    );
    // Report in a stable order, and never a value.
    const problems = ENV_KEYS.filter((key) => failed.has(key)).map((key) => ({
      key,
      missing: input[key] === undefined,
    }));
    throw new ConfigValidationError(problems);
  }
  const value = result.data;
  return {
    appEnv: value.APP_ENV,
    port: value.PORT,
    logLevel: value.LOG_LEVEL,
    trustProxy: value.TRUST_PROXY,
    databaseUrl: value.DATABASE_URL,
    redisUrl: value.REDIS_URL,
  };
}
