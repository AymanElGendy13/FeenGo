// ESLint config for apps/partner-web: the shared root config plus Next.js's own
// rules (core web vitals, React, hooks, accessibility, TypeScript). ESLint 10
// uses the config nearest to each file, so this file extends the root one.
// ESLint 10 runs eslint-config-next's plugins through the peer override recorded
// in pnpm-workspace.yaml (docs/ARCHITECTURE.md section 17).
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';
import rootConfig from '../../eslint.config.mjs';

export default defineConfig([
  rootConfig,
  ...nextVitals,
  ...nextTypeScript,
  {
    // eslint-config-next lowers these two to warnings; the workspace treats them as errors.
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-unused-expressions': 'error',
    },
  },
  globalIgnores([
    '.next/',
    'next-env.d.ts',
    'test-results/',
    'playwright-report/',
    'screenshots/',
  ]),
]);
