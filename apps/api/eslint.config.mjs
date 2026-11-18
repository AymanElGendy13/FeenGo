// ESLint config for apps/api: the shared root config plus the API's own rules.
// ESLint 10 uses the config nearest to each file, so this file extends the root one.
import { readdirSync } from 'node:fs';
import { defineConfig } from 'eslint/config';
import rootConfig from '../../eslint.config.mjs';

// Each folder in src/ is a module (docs/ARCHITECTURE.md section 4.2).
const modules = readdirSync(new URL('./src', import.meta.url), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

export default defineConfig([
  rootConfig,
  {
    // Module boundaries (section 4.2): code outside a module imports it only through
    // its index.ts, never a file inside it.
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: `(^|/)(${modules.join('|')})/(?!index\\.js$).+`,
              message:
                "Import another module only through its index.ts (for example '../core/index.js').",
            },
          ],
        },
      ],
    },
  },
]);
