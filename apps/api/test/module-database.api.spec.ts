import { readdirSync } from 'node:fs';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { sql, type Kysely } from 'kysely';
import { afterAll, beforeAll, describe, expect, expectTypeOf, it } from 'vitest';
import { DATABASE } from '../src/core/database/database.js';
import type { Database, ModuleDatabase } from '../src/core/index.js';
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

/**
 * Who owns which table: the table in docs/ARCHITECTURE.md section 4.2. Each module's
 * database type must give it exactly these tables, every table must have one owner,
 * and every module with a `<module>.database.ts` must be listed here.
 */
const OWNED_TABLES = {
  health: [],
  settings: ['setting_definitions', 'settings'],
} as const satisfies Record<string, readonly (keyof Database)[]>;
type Owned<Module extends keyof typeof OWNED_TABLES> = (typeof OWNED_TABLES)[Module][number];

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
  it('S0 each module database holds exactly the tables the module owns in section 4.2', () => {
    // Checked by `pnpm typecheck`: asking for a table a module does not own fails here.
    expectTypeOf<TablesOf<HealthDatabase>>().toEqualTypeOf<Owned<'health'>>();
    expectTypeOf<TablesOf<SettingsDatabase>>().toEqualTypeOf<Owned<'settings'>>();
    // Every generated table has an owner; a new table fails until it is given one.
    expectTypeOf<keyof Database>().toEqualTypeOf<Owned<keyof typeof OWNED_TABLES>>();

    // No table has two owners.
    const tables = Object.values(OWNED_TABLES).flat();
    expect(new Set(tables).size).toBe(tables.length);

    // Every module that declares a database is in the map above.
    const src = new URL('../src/', import.meta.url);
    const modulesWithDatabase = readdirSync(src, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .filter((entry) =>
        readdirSync(new URL(`${entry.name}/`, src)).includes(`${entry.name}.database.ts`),
      )
      .map((entry) => entry.name)
      .sort();
    expect(modulesWithDatabase).toEqual(Object.keys(OWNED_TABLES).sort());
  });

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

    it('S0 every table in the migrated database has an owning module', async () => {
      const { rows } = await sql<{ tablename: string }>`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
      `.execute(app.get<Kysely<unknown>>(DATABASE));
      expect(rows.map((row) => row.tablename)).toEqual(Object.values(OWNED_TABLES).flat().sort());
    });
  });
});
