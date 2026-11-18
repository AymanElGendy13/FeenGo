import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.factory.js';
import { ConfigValidationError, loadConfig } from './core/index.js';

// The repository's root .env, read if it exists (local development: copy
// .env.example), and only when APP_ENV is unset or `local`: never in staging or
// production. Variables already set in the environment take precedence.
const LOCAL_ENV_FILE = fileURLToPath(new URL('../../../.env', import.meta.url));
const appEnv = process.env.APP_ENV;

if ((appEnv === undefined || appEnv === 'local') && existsSync(LOCAL_ENV_FILE)) {
  process.loadEnvFile(LOCAL_ENV_FILE);
}

try {
  // Checked before Nest starts, so a bad environment gives one clear message. The
  // message names each variable and never its value.
  const { port } = loadConfig(process.env);
  const app = await createApp();
  await app.listen(port);
} catch (error) {
  if (error instanceof ConfigValidationError) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
  throw error;
}
