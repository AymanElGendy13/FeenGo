// C4: the settings store (docs/ARCHITECTURE.md section 6.1, R-01, R-02).
//
// No foreign key to venues yet (S2) or to booking categories (S4), and no setting
// rows: the first keys arrive with S1. The app role gets SELECT, INSERT, UPDATE and
// DELETE on both tables from the migrator's default privileges (section 5.1).
//
// Imports only from packages: see the note at the top of ../migrator.ts.

import { sql, type Kysely } from 'kysely';

// A migration sees the database as it was at its point in history, not as today's
// generated types describe it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
type AnyDatabase = Kysely<any>;

export async function up(db: AnyDatabase): Promise<void> {
  await sql`
    CREATE TABLE setting_definitions (
      key text PRIMARY KEY,
      module text NOT NULL,
      value_type text NOT NULL,
      unit text,
      venue_overridable boolean NOT NULL DEFAULT false,
      per_booking_category boolean NOT NULL DEFAULT false,
      label_en text NOT NULL,
      label_ar text NOT NULL,
      description_en text NOT NULL,
      description_ar text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT setting_definitions_key_format_ck
        CHECK (key ~ '^[a-z][a-z0-9_]*(\\.[a-z][a-z0-9_]*)+$'),
      CONSTRAINT setting_definitions_value_type_ck
        CHECK (value_type IN ('integer', 'decimal', 'boolean', 'string', 'enum', 'money', 'duration', 'json'))
    )
  `.execute(db);

  await sql`
    CREATE TABLE settings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      key text NOT NULL,
      scope text NOT NULL,
      venue_id uuid,
      booking_category_id uuid,
      value jsonb NOT NULL,
      min_value jsonb,
      max_value jsonb,
      allowed_values jsonb,
      version integer NOT NULL DEFAULT 1,
      updated_by_type text NOT NULL,
      updated_by_id uuid,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT settings_key_fkey
        FOREIGN KEY (key) REFERENCES setting_definitions (key) ON DELETE RESTRICT,
      CONSTRAINT settings_scope_ck
        CHECK (scope IN ('platform', 'venue')),
      CONSTRAINT settings_scope_venue_ck
        CHECK ((scope = 'platform') = (venue_id IS NULL)),
      CONSTRAINT settings_limits_platform_only_ck
        CHECK (scope = 'platform' OR (min_value IS NULL AND max_value IS NULL AND allowed_values IS NULL)),
      CONSTRAINT settings_updated_by_type_ck
        CHECK (updated_by_type IN ('system', 'admin', 'partner_user'))
    )
  `.execute(db);

  // NULLS NOT DISTINCT (PostgreSQL 15+): a null category counts as one value.
  await sql`
    CREATE UNIQUE INDEX settings_platform_key_category_uq
      ON settings (key, booking_category_id) NULLS NOT DISTINCT
      WHERE scope = 'platform'
  `.execute(db);

  await sql`
    CREATE UNIQUE INDEX settings_venue_key_venue_category_uq
      ON settings (key, venue_id, booking_category_id) NULLS NOT DISTINCT
      WHERE scope = 'venue'
  `.execute(db);

  await sql`
    CREATE INDEX settings_venue_id_idx
      ON settings (venue_id)
      WHERE scope = 'venue'
  `.execute(db);
}

export async function down(db: AnyDatabase): Promise<void> {
  await sql`DROP TABLE settings`.execute(db);
  await sql`DROP TABLE setting_definitions`.execute(db);
}
