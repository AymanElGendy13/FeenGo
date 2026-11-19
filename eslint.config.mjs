// Shared ESLint flat config for the FeenGo workspace (docs/ARCHITECTURE.md section 2).
// It covers the JavaScript and TypeScript files that exist at the root today. Each app
// adds its own rules in its own folder when it is created (C2, C8, C9).
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

// Node globals for plain JavaScript files that run in Node, such as this config
// file. Listed by hand rather than through the `globals` package. Add a name here
// when a root script needs it. TypeScript files do not need this list: the
// typescript-eslint recommended config turns off `no-undef` for them.
const nodeGlobals = {
  process: 'readonly',
  console: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  Buffer: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  structuredClone: 'readonly',
};

export default defineConfig([
  globalIgnores([
    '**/dist/',
    '**/build/',
    '**/coverage/',
    '**/.next/',
    // Playwright output (also in .gitignore).
    '**/test-results/',
    '**/playwright-report/',
    '**/blob-report/',
    '**/playwright/.cache/',
    // Flutter app: linted by `flutter analyze`, not ESLint.
    'apps/mobile/',
    // Documents only; owned by the architect and others.
    'docs/',
  ]),
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: nodeGlobals,
    },
  },
]);
