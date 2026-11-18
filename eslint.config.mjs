// Shared ESLint flat config for the FeenGo workspace (docs/ARCHITECTURE.md section 2).
// It covers the JavaScript and TypeScript files that exist at the root today. Each app
// adds its own rules in its own folder when it is created (C2, C8, C9).
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    '**/dist/',
    '**/build/',
    '**/coverage/',
    '**/.next/',
    // Flutter app: linted by `flutter analyze`, not ESLint.
    'apps/mobile/',
    // Documents only; owned by the architect and others.
    'docs/',
  ]),
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    extends: [tseslint.configs.recommended],
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
]);
