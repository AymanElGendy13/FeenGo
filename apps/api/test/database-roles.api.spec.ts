import { randomBytes } from 'node:crypto';
import { sql, type Kysely } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../src/core/index.js';
import {
  appUrl,
  connect,
  INSUFFICIENT_PRIVILEGE,
  migrateSharedDatabase,
  migratorUrl,
  violation,
} from './support/database.js';

// The two roles (docs/ARCHITECTURE.md section 5.1). Default privileges apply in the
// `public` schema only, so this test uses the shared database, migrated to latest.
// Its rows have a key of their own and are removed afterwards.

describe('database roles', () => {
  let migrator: Kysely<Database>;
  let app: Kysely<Database>;
  const key = `test.c4_roles_${randomBytes(4).toString('hex')}.probe`;

  beforeAll(async () => {
    await migrateSharedDatabase();
    migrator = connect(migratorUrl());
    app = connect(appUrl());
    // Definitions are written by migrations, so the migrator adds this one.
    await migrator
      .insertInto('setting_definitions')
      .values({
        key,
        module: 'settings',
        value_type: 'integer',
        label_en: 'Role test',
        label_ar: 'اختبار الأدوار',
        description_en: 'Used by the C4 role test only.',
        description_ar: 'يُستخدم في اختبار الأدوار فقط.',
      })
      .execute();
  });

  afterAll(async () => {
    await migrator?.deleteFrom('settings').where('key', '=', key).execute();
    await migrator?.deleteFrom('setting_definitions').where('key', '=', key).execute();
    await Promise.all([migrator?.destroy(), app?.destroy()]);
  });

  it('S0 the app role can select, insert, update and delete settings rows but cannot create tables', async () => {
    const { current_user } = await sql<{ current_user: string }>`SELECT current_user`
      .execute(app)
      .then((result) => result.rows[0]!);
    expect(current_user).toBe('feengo_app');

    const inserted = await app
      .insertInto('settings')
      .values({ key, scope: 'platform', value: JSON.stringify(5), updated_by_type: 'system' })
      .returning(['id', 'version'])
      .executeTakeFirstOrThrow();
    expect(inserted.version).toBe(1);

    const updated = await app
      .updateTable('settings')
      .set((eb) => ({ value: JSON.stringify(6), version: eb('version', '+', 1) }))
      .where('id', '=', inserted.id)
      .returning(['value', 'version'])
      .executeTakeFirstOrThrow();
    expect(updated).toEqual({ value: 6, version: 2 });

    const read = await app
      .selectFrom('settings')
      .innerJoin('setting_definitions', 'setting_definitions.key', 'settings.key')
      .select(['settings.value', 'setting_definitions.module'])
      .where('settings.id', '=', inserted.id)
      .executeTakeFirstOrThrow();
    expect(read).toEqual({ value: 6, module: 'settings' });

    const deleted = await app
      .deleteFrom('settings')
      .where('id', '=', inserted.id)
      .executeTakeFirst();
    expect(deleted.numDeletedRows).toBe(1n);

    // No DDL: not in public, not as a temporary table.
    expect(
      await violation(sql`CREATE TABLE public.c4_app_role_probe (id integer)`.execute(app)),
    ).toEqual({ code: INSUFFICIENT_PRIVILEGE, constraint: undefined });
    expect(
      await violation(sql`CREATE TEMPORARY TABLE c4_app_role_probe (id integer)`.execute(app)),
    ).toEqual({ code: INSUFFICIENT_PRIVILEGE, constraint: undefined });

    // The same, as the catalogue records it. TRUNCATE is not among the default grants.
    const { rows } = await sql<Record<string, boolean>>`
      SELECT
        has_table_privilege('feengo_app', 'public.settings', 'SELECT') AS settings_select,
        has_table_privilege('feengo_app', 'public.settings', 'INSERT') AS settings_insert,
        has_table_privilege('feengo_app', 'public.settings', 'UPDATE') AS settings_update,
        has_table_privilege('feengo_app', 'public.settings', 'DELETE') AS settings_delete,
        has_table_privilege('feengo_app', 'public.settings', 'TRUNCATE') AS settings_truncate,
        has_table_privilege('feengo_app', 'public.setting_definitions', 'SELECT') AS definitions_select,
        has_schema_privilege('feengo_app', 'public', 'CREATE') AS schema_create,
        has_database_privilege('feengo_app', current_database(), 'CREATE') AS database_create,
        has_database_privilege('feengo_app', current_database(), 'TEMPORARY') AS database_temporary
    `.execute(migrator);
    expect(rows[0]).toEqual({
      settings_select: true,
      settings_insert: true,
      settings_update: true,
      settings_delete: true,
      settings_truncate: false,
      definitions_select: true,
      schema_create: false,
      database_create: false,
      database_temporary: false,
    });
  });

  it('S0 the app role cannot read or change the migration history', async () => {
    const all = 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER';
    const { rows } = await sql<Record<string, boolean | string | null>>`
      SELECT
        (SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname = 'feengo_migrations')
          AS schema_owner,
        has_schema_privilege('feengo_app', 'feengo_migrations', 'USAGE') AS schema_usage,
        has_schema_privilege('feengo_app', 'feengo_migrations', 'CREATE') AS schema_create,
        has_table_privilege('feengo_app', 'feengo_migrations.kysely_migration', ${all})
          AS migration_any,
        has_table_privilege('feengo_app', 'feengo_migrations.kysely_migration_lock', ${all})
          AS migration_lock_any,
        to_regclass('public.kysely_migration')::text AS public_migration,
        to_regclass('public.kysely_migration_lock')::text AS public_migration_lock
    `.execute(migrator);
    expect(rows[0]).toEqual({
      schema_owner: 'feengo_migrator',
      schema_usage: false,
      schema_create: false,
      migration_any: false,
      migration_lock_any: false,
      public_migration: null,
      public_migration_lock: null,
    });

    // And in practice, as the app role.
    for (const query of [
      sql`SELECT * FROM feengo_migrations.kysely_migration`,
      sql`DELETE FROM feengo_migrations.kysely_migration`,
      sql`UPDATE feengo_migrations.kysely_migration_lock SET is_locked = 0`,
    ]) {
      expect(await violation(query.execute(app))).toEqual({
        code: INSUFFICIENT_PRIVILEGE,
        constraint: undefined,
      });
    }
  });
});
