// ESLint config for apps/api: the shared root config plus the API's own rules.
// ESLint 10 uses the config nearest to each file, so this file extends the root one.
import { readdirSync } from 'node:fs';
import { defineConfig } from 'eslint/config';
import rootConfig from '../../eslint.config.mjs';

// Each folder in src/ is a module (docs/ARCHITECTURE.md section 4.2).
const srcEntries = readdirSync(new URL('./src', import.meta.url), {
  withFileTypes: true,
  recursive: true,
});
const modules = srcEntries
  .filter((entry) => entry.isDirectory() && entry.parentPath.endsWith('/src'))
  .map((entry) => entry.name);

// How many folders below src/ the deepest file is.
const srcPath = new URL('./src', import.meta.url).pathname;
const maxDepth = Math.max(
  0,
  ...srcEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.parentPath.slice(srcPath.length).split('/').filter(Boolean).length),
);

// Module boundaries (section 4.2): code outside a module imports it only through its
// index.ts, never a file inside it. An import reaches another module only when it
// climbs out of the importing file's own module, which takes exactly as many `../`
// as the file is folders deep below src/ (none for a file directly in src/). So a
// module's own folders, such as core's `./database/`, never count, even when another
// module has the same name.
function boundaryRule(depth) {
  const climb = depth === 0 ? '\\./' : `(\\.\\./){${depth}}`;
  return {
    files: [`src/${'*/'.repeat(depth)}*.ts`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: `^${climb}(${modules.join('|')})/(?!index\\.js$)`,
              message:
                "Import another module only through its index.ts (for example '../core/index.js').",
            },
          ],
        },
      ],
    },
  };
}

export default defineConfig([
  rootConfig,
  ...Array.from({ length: maxDepth + 1 }, (_unused, depth) => boundaryRule(depth)),
]);
