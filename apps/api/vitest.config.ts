import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    // API tests run against the real Compose Postgres and Redis (docker compose up -d).
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
