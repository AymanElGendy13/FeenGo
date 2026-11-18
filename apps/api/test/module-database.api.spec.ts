import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Kysely } from 'kysely';
import { afterAll, beforeAll, describe, expect, expectTypeOf, it } from 'vitest';
import { DATABASE } from '../src/core/database/database.js';
import type { ModuleDatabase } from '../src/core/index.js';
import { HEALTH_DATABASE, type HealthDatabase } from '../src/health/health.database.js';
import { SETTINGS_DATABASE, type SettingsDatabase } from '../src/settings/settings.database.js';
import { createTestApp } from './support/app.js';
import { migrateSharedDatabase } from './support/database.js';

// Narrowed Kysely typing per module (docs/ARCHITECTURE.md section 4.2): each module
// receives the shared database typed with only its own tables.
//
// The type checks below are proved by `pnpm typecheck`, which covers test/: each
// `@ts-expect-error` fails the type check if its line ever compiles, because an
// unused directive is itself an error. Vitest runs these files without checking types.

type TablesOf<Db> = Db extends Kysely<infer Tables> ? keyof Tables : never;

/** Never called: its body exists for the type checker. */
function queriesOutsideTheSettingsModule(health: HealthDatabase, other: ModuleDatabase<never>) {
  return [
    // @ts-expect-error health owns no tables, so it cannot query the settings tables
    health.selectFrom('settings').selectAll(),
    // @ts-expect-error nor their definitions
    health.selectFrom('setting_definitions').selectAll(),
    // @ts-expect-error a future module that does not own them cannot either
    other.insertInto('settings').values({ key: 'a.b', scope: 'platform' }),
    // @ts-expect-error not even by joining them in
    other.selectFrom('settings as s').innerJoin('setting_definitions as d', 'd.key', 's.key'),
  ];
}

/** Never called: the settings module can query its own tables. */
function queriesInsideTheSettingsModule(settings: SettingsDatabase) {
  return settings
    .selectFrom('settings')
    .innerJoin('setting_definitions', 'setting_definitions.key', 'settings.key')
    .select(['settings.value', 'setting_definitions.value_type']);
}

describe('narrowed database per module', () => {
  it('S0 a module outside settings cannot query the settings tables through its database', () => {
    expectTypeOf<TablesOf<HealthDatabase>>().toEqualTypeOf<never>();
    expectTypeOf<TablesOf<SettingsDatabase>>().toEqualTypeOf<'setting_definitions' | 'settings'>();
    expectTypeOf(queriesOutsideTheSettingsModule).toBeFunction();
    expectTypeOf(queriesInsideTheSettingsModule).returns.toHaveProperty('execute');
  });

  describe('at run time', () => {
    let app: NestExpressApplication;

    beforeAll(async () => {
      await migrateSharedDatabase();
      app = await createTestApp();
    });

    afterAll(async () => {
      await app?.close();
    });

    it('S0 each module gets the one shared database, connected as the app role', async () => {
      const shared = app.get<Kysely<unknown>>(DATABASE);
      const settings = app.get<SettingsDatabase>(SETTINGS_DATABASE);
      expect(settings).toBe(shared);
      expect(app.get<HealthDatabase>(HEALTH_DATABASE)).toBe(shared);

      // A typed query on the settings module's own tables runs as feengo_app.
      const rows = await settings
        .selectFrom('setting_definitions')
        .select(['key'])
        .where('key', '=', 'test.c4.does_not_exist')
        .execute();
      expect(rows).toEqual([]);
    });
  });
});
