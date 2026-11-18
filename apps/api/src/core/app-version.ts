import { readFileSync } from 'node:fs';

// apps/api/package.json, read at start-up. The relative path is the same from
// src/core (tests, start:dev) and dist/core (the build).
const packageJson: unknown = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
);

function versionOf(value: unknown): string {
  const version: unknown = (value as { version?: unknown } | null)?.version;
  if (typeof version !== 'string' || version.length === 0) {
    throw new Error('apps/api/package.json has no version');
  }
  return version;
}

/** Version of the running API build, from package.json. */
export const APP_VERSION = versionOf(packageJson);
