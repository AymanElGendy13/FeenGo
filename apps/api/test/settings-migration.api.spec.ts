import { sql, type Insertable, type Kysely } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../src/core/index.js';
import { runMigrations } from '../src/database/migrator.js';
import {
  CHECK_VIOLATION,
  createIsolatedSchema,
  FOREIGN_KEY_VIOLATION,
  RESTRICT_VIOLATION,
  UNIQUE_VIOLATION,
  violation,
  type IsolatedSchema,
} from './support/database.js';

// Migration 202611182330_create_settings_tables (docs/ARCHITECTURE.md section 6.1),
// run as feengo_migrator in a schema of its own, so it can go up and down freely.

type NewSetting = Insertable<Database['settings']>;

const CATEGORY_A = '00000000-0000-4000-8000-00000000000a';
const CATEGORY_B = '00000000-0000-4000-8000-00000000000b';
const VENUE_1 = '00000000-0000-4000-8000-000000000001';
const VENUE_2 = '00000000-0000-4000-8000-000000000002';

const json = (value: unknown): string => JSON.stringify(value);

async function tablesIn(db: Kysely<Database>, schema: string): Promise<string[]> {
  const { rows } = await sql<{ tablename: string }>`
    SELECT tablename FROM pg_tables WHERE schemaname = ${schema} ORDER BY tablename
  `.execute(db);
  return rows.map((row) => row.tablename);
}

describe('settings migration', () => {
  let schema: IsolatedSchema;
  let keyCounter = 0;

  /** A new definition with a unique key, so tests never collide on the unique indexes. */
  async function defineSetting(): Promise<string> {
    keyCounter += 1;
    const key = `test.c4.setting_${keyCounter}`;
    await schema.db
      .insertInto('setting_definitions')
      .values({
        key,
        module: 'settings',
        value_type: 'integer',
        unit: 'seconds',
        label_en: 'Test setting',
        label_ar: 'إعداد تجريبي',
        description_en: 'Used by the C4 migration tests only.',
        description_ar: 'يُستخدم في اختبارات الترحيل فقط.',
      })
      .execute();
    return key;
  }

  function platformRow(key: string, extra: Partial<NewSetting> = {}): NewSetting {
    return { key, scope: 'platform', value: json(300), updated_by_type: 'system', ...extra };
  }

  function venueRow(key: string, extra: Partial<NewSetting> = {}): NewSetting {
    return {
      key,
      scope: 'venue',
      venue_id: VENUE_1,
      value: json(120),
      updated_by_type: 'partner_user',
      ...extra,
    };
  }

  const insertSetting = (row: NewSetting) =>
    schema.db.insertInto('settings').values(row).returningAll().executeTakeFirstOrThrow();

  beforeAll(async () => {
    schema = await createIsolatedSchema();
  });

  afterAll(async () => {
    await schema?.drop();
  });

  // Runs first: the later tests use the tables it leaves migrated up.
  it('R-01 the settings migration runs up, down and up again on an empty database', async () => {
    const options = { migrationTableSchema: schema.name };
    const kyselyTables = ['kysely_migration', 'kysely_migration_lock'];
    expect(await tablesIn(schema.db, schema.name)).toEqual([]);

    const up = await runMigrations(schema.db, 'latest', options);
    expect(up.error).toBeUndefined();
    expect(up.results).toEqual([
      { migrationName: '202611182330_create_settings_tables', direction: 'Up', status: 'Success' },
    ]);
    expect(await tablesIn(schema.db, schema.name)).toEqual([
      ...kyselyTables,
      'setting_definitions',
      'settings',
    ]);

    const down = await runMigrations(schema.db, 'down-all', options);
    expect(down.error).toBeUndefined();
    expect(down.results).toEqual([
      {
        migrationName: '202611182330_create_settings_tables',
        direction: 'Down',
        status: 'Success',
      },
    ]);
    expect(await tablesIn(schema.db, schema.name)).toEqual(kyselyTables);

    const again = await runMigrations(schema.db, 'latest', options);
    expect(again.error).toBeUndefined();
    expect(again.results?.map((result) => result.status)).toEqual(['Success']);
    expect(await tablesIn(schema.db, schema.name)).toEqual([
      ...kyselyTables,
      'setting_definitions',
      'settings',
    ]);

    // Nothing pending afterwards, and no setting rows seeded (the first keys come in S1).
    const noop = await runMigrations(schema.db, 'latest', options);
    expect(noop.results).toEqual([]);
    expect(await schema.db.selectFrom('setting_definitions').selectAll().execute()).toEqual([]);
    expect(await schema.db.selectFrom('settings').selectAll().execute()).toEqual([]);
  });

  it('R-01 the settings indexes are exactly the ones section 6.1 describes', async () => {
    const { rows } = await sql<{ indexname: string; indexdef: string }>`
      SELECT indexname, indexdef FROM pg_indexes
      WHERE schemaname = ${schema.name} AND tablename = 'settings'
      ORDER BY indexname
    `.execute(schema.db);
    const on = `ON ${schema.name}.settings USING btree`;
    expect(rows).toEqual([
      { indexname: 'settings_pkey', indexdef: `CREATE UNIQUE INDEX settings_pkey ${on} (id)` },
      {
        indexname: 'settings_platform_key_category_uq',
        indexdef:
          `CREATE UNIQUE INDEX settings_platform_key_category_uq ${on} ` +
          "(key, booking_category_id) NULLS NOT DISTINCT WHERE (scope = 'platform'::text)",
      },
      {
        indexname: 'settings_venue_id_idx',
        indexdef: `CREATE INDEX settings_venue_id_idx ${on} (venue_id) WHERE (scope = 'venue'::text)`,
      },
      {
        indexname: 'settings_venue_key_venue_category_uq',
        indexdef:
          `CREATE UNIQUE INDEX settings_venue_key_venue_category_uq ${on} ` +
          "(key, venue_id, booking_category_id) NULLS NOT DISTINCT WHERE (scope = 'venue'::text)",
      },
    ]);
  });

  it('R-01 a new setting row gets a generated id, version 1 and timestamps by default', async () => {
    const key = await defineSetting();
    const row = await insertSetting(platformRow(key));

    expect(row.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(row.version).toBe(1);
    expect(row.value).toBe(300);
    expect(row.created_at).toBeInstanceOf(Date);
    expect(row.updated_at).toBeInstanceOf(Date);
    const definition = await schema.db
      .selectFrom('setting_definitions')
      .selectAll()
      .where('key', '=', key)
      .executeTakeFirstOrThrow();
    expect(definition.venue_overridable).toBe(false);
    expect(definition.per_booking_category).toBe(false);
    expect(definition.created_at).toBeInstanceOf(Date);
  });

  it('R-02 only platform settings may carry limits', async () => {
    const key = await defineSetting();
    const limits = [
      { min_value: json(60) },
      { max_value: json(900) },
      { allowed_values: json(['EG']) },
    ];

    for (const limit of limits) {
      expect(await violation(insertSetting(venueRow(key, limit)))).toEqual({
        code: CHECK_VIOLATION,
        constraint: 'settings_limits_platform_only_ck',
      });
    }

    // The same limits on the platform row are accepted, and a venue row without them too.
    await insertSetting(
      platformRow(key, {
        min_value: json(60),
        max_value: json(900),
        allowed_values: json([60, 300, 900]),
      }),
    );
    await insertSetting(venueRow(key));
  });

  it('R-01 a setting key must match the dotted lowercase pattern', async () => {
    const definition = (key: string) =>
      schema.db
        .insertInto('setting_definitions')
        .values({
          key,
          module: 'settings',
          value_type: 'integer',
          label_en: 'x',
          label_ar: 'x',
          description_en: 'x',
          description_ar: 'x',
        })
        .execute();

    for (const key of ['auth.otp.code_ttl_seconds', 'a.b', 'bookings.window2.days_ahead']) {
      await definition(key);
    }

    const rejected = [
      'auth',
      'Auth.otp.ttl',
      'auth.OTP.ttl',
      'auth..ttl',
      'auth.otp.',
      '.auth.otp',
      '1auth.otp',
      'auth.1otp',
      'auth._otp',
      'auth.otp-ttl',
      'auth.otp ttl',
      'auth/otp.ttl',
      '',
    ];
    for (const key of rejected) {
      expect(await violation(definition(key)), key).toEqual({
        code: CHECK_VIOLATION,
        constraint: 'setting_definitions_key_format_ck',
      });
    }
  });

  it('R-01 a venue setting needs a venue and a platform setting must not have one', async () => {
    const key = await defineSetting();
    const broken = [venueRow(key, { venue_id: null }), platformRow(key, { venue_id: VENUE_1 })];
    for (const row of broken) {
      expect(await violation(insertSetting(row))).toEqual({
        code: CHECK_VIOLATION,
        constraint: 'settings_scope_venue_ck',
      });
    }

    await insertSetting(platformRow(key));
    await insertSetting(venueRow(key));
  });

  it('R-01 one platform value per key and booking category, with a null category counted once', async () => {
    const key = await defineSetting();
    const platformUnique = {
      code: UNIQUE_VIOLATION,
      constraint: 'settings_platform_key_category_uq',
    };

    // Without NULLS NOT DISTINCT, a second null-category row would be accepted.
    await insertSetting(platformRow(key));
    expect(await violation(insertSetting(platformRow(key)))).toEqual(platformUnique);

    // One row per category, each once.
    await insertSetting(platformRow(key, { booking_category_id: CATEGORY_A }));
    await insertSetting(platformRow(key, { booking_category_id: CATEGORY_B }));
    expect(
      await violation(insertSetting(platformRow(key, { booking_category_id: CATEGORY_A }))),
    ).toEqual(platformUnique);

    // The same for venue values, per venue: a venue row never clashes with a platform one.
    const venueUnique = {
      code: UNIQUE_VIOLATION,
      constraint: 'settings_venue_key_venue_category_uq',
    };
    await insertSetting(venueRow(key));
    expect(await violation(insertSetting(venueRow(key)))).toEqual(venueUnique);
    await insertSetting(venueRow(key, { venue_id: VENUE_2 }));
    await insertSetting(venueRow(key, { booking_category_id: CATEGORY_A }));
    expect(
      await violation(insertSetting(venueRow(key, { booking_category_id: CATEGORY_A }))),
    ).toEqual(venueUnique);
  });

  it('R-01 settings accept only the known scopes, value types and editor types', async () => {
    const key = await defineSetting();
    expect(await violation(insertSetting(platformRow(key, { scope: 'global' })))).toEqual({
      code: CHECK_VIOLATION,
      constraint: 'settings_scope_ck',
    });
    expect(
      await violation(insertSetting(platformRow(key, { updated_by_type: 'customer' }))),
    ).toEqual({ code: CHECK_VIOLATION, constraint: 'settings_updated_by_type_ck' });

    const valueType = (value_type: string) =>
      schema.db
        .insertInto('setting_definitions')
        .values({
          key: `test.c4.value_type_${value_type}`,
          module: 'settings',
          value_type,
          label_en: 'x',
          label_ar: 'x',
          description_en: 'x',
          description_ar: 'x',
        })
        .execute();
    for (const type of [
      'integer',
      'decimal',
      'boolean',
      'string',
      'enum',
      'money',
      'duration',
      'json',
    ]) {
      await valueType(type);
    }
    expect(await violation(valueType('date'))).toEqual({
      code: CHECK_VIOLATION,
      constraint: 'setting_definitions_value_type_ck',
    });
  });

  it('R-01 a setting needs a defined key, and a definition in use cannot be deleted', async () => {
    expect(await violation(insertSetting(platformRow('test.c4.undefined_key')))).toEqual({
      code: FOREIGN_KEY_VIOLATION,
      constraint: 'settings_key_fkey',
    });

    const key = await defineSetting();
    await insertSetting(platformRow(key));
    expect(
      await violation(schema.db.deleteFrom('setting_definitions').where('key', '=', key).execute()),
    ).toEqual({ code: RESTRICT_VIOLATION, constraint: 'settings_key_fkey' });

    // RESTRICT, not the default NO ACTION, as the catalogue records it.
    const { rows } = await sql<{ confdeltype: string }>`
      SELECT confdeltype FROM pg_constraint
      WHERE conname = 'settings_key_fkey' AND connamespace = ${schema.name}::regnamespace
    `.execute(schema.db);
    expect(rows).toEqual([{ confdeltype: 'r' }]);
  });
});
