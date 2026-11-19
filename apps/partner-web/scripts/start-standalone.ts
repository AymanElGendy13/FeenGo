// Runs the production build the way it ships: the standalone server that
// `output: 'standalone'` creates (docs/ARCHITECTURE.md section 12), which is
// what `next start` cannot run. Used by `pnpm start` and the Playwright tests.
// Run `pnpm build` first.
//
// Next.js leaves copying the static files next to the server to the deploy step,
// as the Docker image will do, so this script copies them first. It listens on
// localhost only, on PORT (3001 by default); the shell's HOSTNAME is ignored.
import { cpSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const appFolder = join(dirname(fileURLToPath(import.meta.url)), '..');
const standaloneApp = join(appFolder, '.next', 'standalone', 'apps', 'partner-web');
const server = join(standaloneApp, 'server.js');

if (!existsSync(server)) {
  console.error('No standalone build found. Run `pnpm --filter @feengo/partner-web build` first.');
  process.exit(1);
}

cpSync(join(appFolder, '.next', 'static'), join(standaloneApp, '.next', 'static'), {
  recursive: true,
});
if (existsSync(join(appFolder, 'public'))) {
  cpSync(join(appFolder, 'public'), join(standaloneApp, 'public'), { recursive: true });
}

process.env.PORT ??= '3001';
process.env.HOSTNAME = 'localhost';
await import(pathToFileURL(server).href);
