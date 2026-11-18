# FeenGo architecture

**Status: draft for owner approval.** Written 2026-11-18 by the architect for slices S0 (Foundation) and S1 (Sign-in). Approving this document approves the decisions, the pinned versions and the exact dependency lists in sections 17 and 18. Anything outside those lists needs a new approval.

Read with `docs/STACK.md` (the stack and the rules), `docs/PRD.md` (requirement IDs), `docs/ROADMAP.md` (slices) and `docs/api/openapi.yaml` (the contract). Decisions are also logged in `docs/DECISIONS.md`.

## Contents

1. System overview
2. Repository layout and tooling
3. S0 increments C1 to C11
4. Backend: modules, request pipeline and API conventions
5. Database: access layer, migrations and data model
6. Settings store (R-01)
7. Customer sign-in with a phone code (C-02)
8. Sessions and tokens
9. Admin sign-in (A-01) and the activity log (A-11)
10. Account deletion (C-04)
11. Mobile app
12. Websites
13. Design tokens
14. Translations
15. Analytics and deep links (Q-06, C-08)
16. Supported phones (Q-02) and accessibility (Q-04)
17. Pinned versions
18. Dependency list per app
19. Environments, configuration and secrets
20. Hosting options
21. CI plan
22. Questions for the owner
23. Traceability

---

## 1. System overview

```
 Customer app (Flutter)          Partner dashboard (Next.js)     Admin back office (Next.js)
 iPhone and Android              apps/partner-web (from S2)      apps/admin-web
        |                                  |                              |
        | HTTPS, Bearer token              | HTTPS, session cookie        | HTTPS, session cookie
        |                                  v                              v
        |                        Next.js server (BFF)            Next.js server (BFF)
        |                                  | Bearer token                 | Bearer token
        v                                  v                              v
 +------------------------------------------------------------------------------------+
 |  NestJS API (apps/api), stateless, any number of identical containers               |
 |  modules: health, settings, auth, customers, admin, notifications | later: venues,  |
 |  availability, bookings, events, payments                                           |
 +------------------------------------------------------------------------------------+
        |                         |                               |
   PostgreSQL 18            Redis 8                     Outside services behind interfaces:
   (all lasting data)       (rate limits, locks,        WhatsApp and SMS (codes), Firebase
                            settings cache, slot        (analytics, crash reports, push),
                            holds from S4)              Paymob (S6), Google Maps (S3)
```

- **One API** serves all three products. Every rule is enforced there, never only in a client.
- **Stateless API.** No session lives in API memory. Everything shared is in PostgreSQL or Redis, so adding a container is a configuration change (STACK.md).
- **The websites never hand tokens to page scripts.** Each Next.js app has a small server layer (a "backend for frontend", BFF) that keeps tokens in HttpOnly cookies and calls the API itself (section 8).
- **Clear seams for the next scaling stage.** Containers move to AWS as they are. Modules can be split into services along the boundaries below, because no module reads another module's tables.

## 2. Repository layout and tooling

```
FeenGo/
  package.json              root workspace: scripts and shared dev tools only (release-manager)
  pnpm-workspace.yaml       apps/api, apps/partner-web, apps/admin-web, packages/*  (release-manager)
  pnpm-lock.yaml
  .npmrc                    engine-strict, save-exact                               (release-manager)
  .nvmrc                    26.13.1                                                 (release-manager)
  tsconfig.base.json        strict TypeScript settings shared by all TS apps        (release-manager)
  eslint.config.mjs         shared ESLint flat config                               (release-manager)
  .prettierrc               formatting                                              (release-manager)
  docker-compose.yml        local Postgres and Redis (C1)                           (release-manager)
  .env.example              every variable, no values that work anywhere real       (release-manager)
  .github/workflows/        CI                                                      (release-manager)
  apps/
    api/                    NestJS                                                  (backend-dev)
    mobile/                 Flutter, not part of the pnpm workspace                 (mobile-dev)
    partner-web/            Next.js                                                 (web-dev)
    admin-web/              Next.js                                                 (web-dev)
  packages/
    design-tokens/          token source, generator, generated CSS, TS and Dart     (ui-ux-designer)
      flutter/              generated Dart package `feengo_design_tokens`
    web-ui/                 shared React components, created only when needed       (web-dev)
  docs/                     documents; docs/api is the contract                     (architect and others)
  store/                    store listing material                                  (release-manager)
```

**Workspace and package manager: pnpm workspaces, no Turborepo or Nx yet.** Three TypeScript apps and one or two packages do not need a build orchestrator. pnpm gives one lockfile, strict dependency isolation (an app can only import what it declares) and fast installs, and it is already in the development container. The root `package.json` pins the exact pnpm version in its `packageManager` field; any pnpm 10 or later switches to that version by itself, so the container's pnpm 10.28 works. If CI gets slow, Turborepo can be added later without moving any folder.

**Flutter sits outside the pnpm workspace.** It has its own package manager (pub). It reads the design tokens through a path dependency on `packages/design-tokens/flutter`.

**Shared web component library.** `packages/web-ui` is owned by web-dev and is created only when both websites need the same component, which is likely in S2 when the partner dashboard is built. Until then each website keeps its own components. Generated API types for the websites follow the same rule: inside `apps/admin-web` in S1, moved to a shared `packages/api-types` package once the partner dashboard also calls the API.

**Root tooling is owned by release-manager:** the root `package.json`, workspace file, lockfile policy, shared TypeScript, ESLint and Prettier configs, Compose files, `.env.example` and CI. App owners change their own `package.json` only.

**Rules for dependencies.** Exact versions (`save-exact`), one lockfile, `engine-strict` on Node. A dependency not listed in section 18 needs the owner's approval first (CLAUDE.md).

## 3. S0 increments C1 to C11

Each increment is one pull request that builds, tests and can be merged alone. Each one adds its own CI job when it lands, so the pipeline grows with the code.

| Inc. | Pull request | Owner | Needs | What proves it |
| --- | --- | --- | --- | --- |
| C1 | Local services: `docker-compose.yml` with Postgres 18.7 and Redis 8.10.3, an init script that creates the two database roles (section 5), `.env.example` | release-manager | nothing | `docker compose up -d` gives healthy Postgres and Redis |
| C2 | API health: NestJS app, config validation, structured logging, database and Redis clients, `GET /health`, `GET /health/ready` | backend-dev | C1 for readiness | API tests for both endpoints, including 503 when Redis is stopped |
| C3 | CI for the API: workflow skeleton, install, lint, type check, unit and API tests with Postgres and Redis service containers, Docker build, contract lint, dependency scan | release-manager | C2 | Pipeline green on a push |
| C4 | Migration tool and settings tables: Kysely migrator, first migration creating `setting_definitions` and `settings`, migrate up, down, up in CI, type generation | backend-dev | C1, C2 | Migrations run forward and back on an empty database |
| C5 | Design tokens package: DTCG token files with the provisional tokens, Style Dictionary build to CSS, TypeScript and Dart, contrast check, committed outputs | ui-ux-designer | nothing | Build is reproducible; CI fails if outputs are stale |
| C6 | Flutter app shell: flavors, light and dark themes from tokens, English and Arabic with right to left, language and theme switch remembered, placeholder home screen | mobile-dev | C5 | Widget and golden tests in both languages and themes |
| C7 | Analytics test event: Firebase projects wired per flavor, one test event | mobile-dev | C6, and the owner creating Firebase projects | Event seen in Firebase DebugView |
| C8 | Partner-web shell: Next.js app, tokens, English and Arabic with `lang` and `dir`, placeholder page | web-dev | C5 | Unit test and Playwright screenshot in both languages |
| C9 | Admin-web shell: the same for the back office | web-dev | C5 | As C8 |
| C10 | iOS build in CI: unsigned `flutter build ios` on macOS for pull requests to main | release-manager | C6 | Job green on a pull request |
| C11 | Test suites: Maestro smoke flow for the app, Playwright smoke for both websites, API contract tests, all wired into CI | qa-tester | C2 to C10 | Full run green; S0 done-check in ROADMAP.md |

C5 can be built in parallel with C1 to C4. C8 and C9 can follow C5 in either order. Nothing in an earlier increment depends on a later one.

## 4. Backend: modules, request pipeline and API conventions

### 4.1 Framework

NestJS 12 on Express 5 (the NestJS default), as ES modules, TypeScript 6.0 in strict mode. NestJS 12's own project template uses ES modules and Vitest, and this design follows that template rather than fighting it (section 17).

### 4.2 Modules and table ownership

Each module owns its tables. Another module may use them only through the owning module's exported service. This is enforced in two ways:

- **Types.** Each module receives the shared Kysely database object typed with only its own tables (`Kysely<Pick<Database, 'otp_challenges' | ...>>`), so querying another module's table does not compile.
- **Imports.** An ESLint rule allows imports from another module only through its `index.ts`.

| Module | Owns tables | Public service used by others | Slice |
| --- | --- | --- | --- |
| core (config, database, redis, logging, errors) | none | database and Redis clients, `RateLimiter` | S0 |
| health | none | none | S0 |
| settings | `setting_definitions`, `settings` | `SettingsService.get(key, scope)` | S0 tables, S1 first keys, S4 console |
| auth | `otp_challenges`, `devices`, `refresh_tokens` | `AuthGuard`, `SessionService.revokeAllFor(subject)` | S1 |
| customers | `customers` | `CustomersService.findOrCreateByPhone`, `anonymise` | S1 |
| admin | `admin_users`, `admin_activity_log` | `ActivityLog.record(entry)`, `AdminUsersService.verifyPassword` | S1 |
| notifications | none in S1 (message log from S4) | `OtpSender.send(...)` with WhatsApp, SMS and fake providers | S1 |
| venues, availability, bookings, events, payments | later slices | | S2 to S6 |

`customers` is one more module than the list in STACK.md. It keeps profile data apart from sign-in mechanics, so the auth module never touches personal fields directly.

### 4.3 Request pipeline

In order, for every request:

1. **Helmet** security headers. No CORS: the app is not a browser, and the websites call the API from their servers, so the API refuses cross-origin browser calls by default.
2. **Request ID** from `X-Request-Id` (if a valid UUID) or a new one, returned on the response and attached to every log line.
3. **Structured logging** with pino. Redacted paths: `authorization`, `cookie`, any `password`, `code`, `refreshToken`, `mfaToken`, `phone`, `email`. Phone numbers appear in logs only as the last 3 digits.
4. **Body size limit** of 64 KB (file uploads in S2 go straight to object storage, not through JSON bodies).
5. **Rate limit guard** (Redis, section 7.4).
6. **Authentication guard.** Every route needs a valid access token unless it is marked `@Public()`. Secure by default.
7. **Role guard.** Each route declares its roles, matching `x-roles` in the contract. Admin routes also require `amr` to contain `otp`.
8. **Ownership.** Services take the caller's ID from the token, never from the request body. `/v1/me` has no ID in the path, so there is nothing to tamper with.
9. **Validation.** A zod schema per request body and query, written to match the contract, with strict objects that reject unknown fields. API tests check every response against `openapi.yaml`.
10. **Exception filter** turns every error into the `Problem` shape.

### 4.4 API conventions (all in `openapi.yaml`)

- **Versioning.** `/v1/...` for business endpoints. A breaking change gets `/v2` for the affected endpoints only. Health endpoints stay unversioned.
- **One error shape**: RFC 9457 problem details with a stable `code`. Clients translate `code` from their own files, so no user-facing text comes from the server (bilingual rule).
- **Pagination**: opaque `cursor` plus `limit`, response `{ items, nextCursor }`.
- **Times**: stored and sent in UTC (`timestamptz`), shown in Cairo time by clients.
- **Money** (from S4): integer minor units (piastres) plus an ISO 4217 currency code. Never floating point.
- **Bilingual text** (from S2): sent as `{ "en": "...", "ar": "..." }` objects so clients switch language without fetching again.
- **Idempotency** (from S4): booking and payment `POST`s require an `Idempotency-Key` header (UUID). The API stores the key with a hash of the request and the response for 24 hours, scoped to the caller. The same key with the same body returns the stored response; with a different body, `409 IDEMPOTENCY_KEY_REUSED`. Table `idempotency_keys` is created in S4.

## 5. Database: access layer, migrations and data model

### 5.1 Access layer and migrations: Kysely

**Choice: Kysely as the query builder and its built-in migrator for migrations, on the `pg` driver. Types are generated from the migrated database by kysely-codegen.**

Why:

- FeenGo's hardest rules live in SQL: row locks for the last slot (C-10), partial unique indexes, check constraints, an append-only trigger (A-11), a bounding-box distance query (C-05). Kysely writes SQL directly and type-checks it, including `SELECT ... FOR UPDATE`, and drops to raw SQL when needed.
- Its migrator has an `up` and a `down` for every migration, which the backend rule "every migration can be rolled back" requires. It takes a database lock while running, so two containers starting together cannot both migrate.
- One tool for queries and migrations.

Alternatives considered:

- **Prisma 7**: the most popular ORM with NestJS, but no down migrations, check constraints and partial indexes need hand-edited SQL outside its schema, there is no row-lock API, and Prisma 8 is in release candidate, so a major upgrade would follow soon.
- **Drizzle 0.45**: no down migrations, and version 1.0 is in release candidate with breaking changes.
- **TypeORM 1.1**: has down migrations and locks, but decorator entities and a long history of quality problems; 1.0 only arrived in May 2026.

**Migration rules**

- Files `apps/api/src/database/migrations/YYYYMMDDHHmm_<name>.ts`, each with `up` and `down`.
- CI runs up, then down to zero, then up again on an empty database, then regenerates types and fails if `schema.generated.ts` changed.
- Expand then contract: a column is added and filled in one release, and old columns are removed in a later one, so a deploy never breaks running containers.
- In deployed environments, migrations run as a one-off release step before new containers start, using the migrator role.

**Database roles**, created once per environment:

- `feengo_migrator` owns the schema and runs migrations.
- `feengo_app` is what the API connects as: `SELECT, INSERT, UPDATE, DELETE` on ordinary tables, only `SELECT, INSERT` on `admin_activity_log`, no DDL.

**Conventions**: snake_case names; `uuid` keys from `gen_random_uuid()` (built in since PostgreSQL 13, so nothing depends on PostgreSQL 18-only features); `created_at` and `updated_at` as `timestamptz not null default now()`; enumerations as `text` with a `CHECK`, which is easier to extend by migration than a Postgres `enum` type; foreign keys `ON DELETE RESTRICT` unless stated, because rows are anonymised, not deleted.

### 5.2 S0 tables (C4)

The first migration creates the settings tables only. Their design is in section 6.

### 5.3 S1 tables

#### `customers` (module: customers)

| Column | Type | Rules |
| --- | --- | --- |
| `id` | uuid | primary key, default `gen_random_uuid()` |
| `phone_e164` | text, null | `CHECK (phone_e164 ~ '^\+[1-9][0-9]{7,14}$')`; null only after deletion |
| `name` | text, null | `CHECK (char_length(name) BETWEEN 1 AND 80)` |
| `email` | text, null | lower case, `CHECK (char_length(email) <= 254 AND email = lower(email))` |
| `language` | text | not null, default `'en'`, `CHECK (language IN ('en','ar'))` |
| `status` | text | not null, default `'active'`, `CHECK (status IN ('active','suspended','deleted'))` |
| `created_at`, `updated_at` | timestamptz | not null |
| `last_signed_in_at` | timestamptz, null | |
| `deleted_at` | timestamptz, null | |

- Unique partial index `customers_phone_key ON (phone_e164) WHERE phone_e164 IS NOT NULL`: one live account per phone; a deleted account frees the number.
- `CHECK ((status = 'deleted') = (deleted_at IS NOT NULL))`.
- `CHECK (status <> 'deleted' OR (phone_e164 IS NULL AND name IS NULL AND email IS NULL))`: a deleted row holds no personal data.
- `CHECK (status = 'deleted' OR phone_e164 IS NOT NULL)`.
- Room for later: `no_show_count` and the deposit flag (S4, C-13), `referral_code` (S7, C-20). Each is a new nullable or defaulted column, so no existing row needs rewriting.

#### `admin_users` (module: admin)

| Column | Type | Rules |
| --- | --- | --- |
| `id` | uuid | primary key |
| `email` | text | not null, lower case, unique |
| `name` | text | not null, 1 to 80 characters |
| `password_hash` | text | not null, Argon2id encoded string |
| `totp_secret_ciphertext` | bytea | not null, AES-256-GCM encrypted (section 9) |
| `totp_key_id` | text | not null, which encryption key was used, for rotation |
| `totp_last_used_step` | bigint, null | rejects reuse of an accepted code |
| `role` | text | not null, default `'admin'`, `CHECK (role IN ('admin'))`, widened by migration if roles are added |
| `status` | text | not null, default `'active'`, `CHECK (status IN ('active','disabled'))` |
| `failed_attempts` | smallint | not null, default 0, `CHECK (failed_attempts >= 0)` |
| `locked_until` | timestamptz, null | |
| `last_signed_in_at` | timestamptz, null | |
| `created_at`, `updated_at` | timestamptz | not null |

No API creates admins. Rows are created only by the seed command (section 9).

#### `otp_challenges` (module: auth)

| Column | Type | Rules |
| --- | --- | --- |
| `id` | uuid | primary key; the `challengeId` in the contract |
| `phone_e164` | text | not null |
| `installation_id` | uuid | not null |
| `code_hash` | bytea | not null; HMAC-SHA-256 of challenge ID and code with a server secret (pepper). The code itself is never stored or logged. |
| `channel` | text | not null, `CHECK (channel IN ('whatsapp','sms'))`, the channel finally used |
| `fallback_used` | boolean | not null, default false |
| `provider` | text | not null, for example `fake`, `whatsapp-cloud` |
| `provider_message_id` | text, null | for delivery receipts |
| `delivery_status` | text | not null, `CHECK (delivery_status IN ('queued','sent','delivered','failed'))` |
| `language` | text | not null, `CHECK (language IN ('en','ar'))` |
| `wrong_attempts` | smallint | not null, default 0 |
| `expires_at` | timestamptz | not null; `created_at` plus the `auth.otp.code_ttl_seconds` setting at creation |
| `consumed_at` | timestamptz, null | set on success, or when a newer code replaces it, or on lock |
| `created_at` | timestamptz | not null |

- Index `(phone_e164, created_at DESC)` to find and end the previous challenge.
- Unique partial index on `(provider, provider_message_id) WHERE provider_message_id IS NOT NULL` for delivery receipts.
- Index on `created_at` for the purge.
- Retention: rows older than 24 hours are deleted by a daily purge command (`pnpm --filter @feengo/api run job:purge`), run by the host's scheduler. They exist only to verify codes and to debug delivery.

#### `devices` (module: auth)

| Column | Type | Rules |
| --- | --- | --- |
| `id` | uuid | primary key |
| `customer_id` | uuid | not null, foreign key to `customers` |
| `installation_id` | uuid | not null |
| `platform` | text | not null, `CHECK (platform IN ('ios','android'))` |
| `app_version` | text | not null |
| `push_token` | text, null | filled from S4 (C-18) |
| `created_at`, `last_seen_at` | timestamptz | not null |

- Unique `(customer_id, installation_id)`.
- Index `(installation_id)`.
- No hardware identifiers and no device model: only what sign-in and push need.

#### `refresh_tokens` (module: auth)

| Column | Type | Rules |
| --- | --- | --- |
| `id` | uuid | primary key |
| `session_id` | uuid | not null; the token family, and the `sid` claim in access tokens |
| `subject_type` | text | not null, `CHECK (subject_type IN ('customer','admin'))`; widened to `partner_user` in S2 |
| `customer_id` | uuid, null | foreign key to `customers` |
| `admin_user_id` | uuid, null | foreign key to `admin_users` |
| `device_id` | uuid, null | foreign key to `devices`, customers only |
| `token_hash` | bytea | not null, unique; SHA-256 of the token. The token itself is never stored. |
| `auth_time` | timestamptz | not null; when the person last proved who they are, kept through rotation |
| `auth_methods` | text[] | not null; `{otp}` for customers, `{pwd,otp}` for admins |
| `issued_at`, `expires_at` | timestamptz | not null |
| `session_expires_at` | timestamptz | not null; absolute end of the session, which rotation cannot extend |
| `used_at` | timestamptz, null | set when rotated |
| `replaced_by_id` | uuid, null | the next token in the family |
| `revoked_at` | timestamptz, null | |
| `revoked_reason` | text, null | `CHECK (revoked_reason IN ('logout','reuse_detected','account_deleted','suspended','admin_disabled'))` |

- `CHECK ((subject_type = 'customer' AND customer_id IS NOT NULL AND admin_user_id IS NULL) OR (subject_type = 'admin' AND admin_user_id IS NOT NULL AND customer_id IS NULL AND device_id IS NULL))`. S2 adds `partner_user_id` and widens this check in the same migration.
- Indexes: `(session_id)`, `(customer_id) WHERE revoked_at IS NULL`, `(admin_user_id) WHERE revoked_at IS NULL`, `(expires_at)` for the purge.
- Expired or revoked rows are purged after 30 days by the same daily command.

#### `admin_activity_log` (module: admin)

| Column | Type | Rules |
| --- | --- | --- |
| `id` | bigint | primary key, `GENERATED ALWAYS AS IDENTITY`, gives a strict order |
| `occurred_at` | timestamptz | not null, default `now()` |
| `actor_type` | text | not null, `CHECK (actor_type IN ('admin','system'))` |
| `actor_admin_id` | uuid, null | foreign key to `admin_users`; `CHECK (actor_type <> 'admin' OR actor_admin_id IS NOT NULL)` |
| `action` | text | not null, `CHECK (action ~ '^[a-z_]+\.[a-z_]+$')` |
| `target_type` | text, null | for example `admin_user`, later `venue`, `booking` |
| `target_id` | text, null | |
| `reason` | text, null | written reason where the PRD requires one (A-02, A-07, A-08) |
| `details` | jsonb | not null, default `'{}'`; old and new values for edits; never secrets |
| `request_id` | text, null | ties the entry to the API logs |
| `ip_address` | inet, null | of the admin, for security review |

- Indexes: `(occurred_at DESC)`, `(actor_admin_id, occurred_at DESC)`, `(target_type, target_id, occurred_at DESC)`, `(action, occurred_at DESC)`.
- Append-only, enforced by the database and not only by code: `feengo_app` has only `SELECT, INSERT`; a `BEFORE UPDATE OR DELETE OR TRUNCATE` trigger raises an error for every role, including the table owner. The migration's `down` is the only way to drop it, and that runs only on development databases.
- Written in the same transaction as the action it records, so an action cannot happen without its entry.
- Kept indefinitely until a lawyer sets a retention period.

### 5.4 Room for later slices

Not created now. Listed so that S0 and S1 choices do not block them.

| Table (slice) | Key points already decided |
| --- | --- |
| `venues` (S2) | `latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90)`, `longitude ... BETWEEN -180 AND 180`, `city_code`, `country_code` (ISO 3166-1, `'EG'`), `currency_code` (ISO 4217, `'EGP'`), `time_zone` (`'Africa/Cairo'`), `name_en` and `name_ar` both not null, `status` (pending, approved, rejected, suspended). Venue-scope rows in `settings` get their foreign key to `venues` in this migration. |
| `partner_users`, `venue_members` (S2) | owners and staff; `refresh_tokens.partner_user_id` added |
| `plans`, `venue_subscriptions` (S2) | the billing structure that stays switched off (DECISIONS 2026-11-16). Every venue gets the free plan; setting `billing.enabled = false`. |
| `agreement_versions`, `agreement_acceptances` (S2) | accepted version and time (P-01, A-09) |
| `categories`, `occasions`, `cuisines`, `areas` (S2) | admin lists in both languages (A-05) |
| `setting_changes` (S4) | the R-04 log: who, key, scope, old value, new value, when; append-only like the activity log |
| `bookings` (S4) | `policy_snapshot jsonb NOT NULL` (R-03), city, country and currency copied from the venue, status with a `CHECK`, `idempotency_keys` table, slot locking with a Redis hold plus a row lock on the slot inside the booking transaction (C-10) |
| `event_requests`, `quotes` (S5) | the request-for-quote flow |
| `payments`, `refunds`, `payment_events` (S6) | Paymob references only, never card data; each webhook verified and stored before it is trusted |

**"Venues near me" (C-05, S3) without PostGIS.** Plain formula, no extension:

1. The API turns the customer's position and radius into a bounding box (latitude plus or minus radius divided by 111.32 km; longitude adjusted by the cosine of the latitude).
2. `WHERE status = 'approved' AND latitude BETWEEN $1 AND $2 AND longitude BETWEEN $3 AND $4`, served by a B-tree index `(latitude, longitude) WHERE status = 'approved'`.
3. `ORDER BY` the haversine distance from a small `IMMUTABLE` SQL function created by migration, then `LIMIT`.

Why this rather than the bundled `cube` and `earthdistance` extensions: at launch there are hundreds to a few thousand venues, so the box leaves at most a few hundred rows to sort, which takes milliseconds and meets Q-01 (1 second on the server) by a wide margin. It needs no extension, so every managed PostgreSQL supports it. It also avoids `earthdistance`'s known trouble with expression indexes during dump and restore. S3 adds a test that seeds 10,000 venues and checks the query plan and time. If venues grow past about 50,000, a migration adds an `earthdistance` GiST index or PostGIS from the same two columns (DECISIONS 2026-11-18).

## 6. Settings store (R-01)

### 6.1 Tables (created in C4)

**`setting_definitions`**: what a setting is. Rows are added by migrations, never by the API.

| Column | Type | Rules |
| --- | --- | --- |
| `key` | text | primary key, `CHECK (key ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$')`, for example `auth.otp.code_ttl_seconds` |
| `module` | text | not null, the module that reads it |
| `value_type` | text | not null, `CHECK (value_type IN ('integer','decimal','boolean','string','enum','money','duration','json'))` |
| `unit` | text, null | `seconds`, `minutes`, `hours`, `days`, `percent`, `count`; money carries its currency in the value |
| `venue_overridable` | boolean | not null, default false; true means a venue may choose its own value inside the admin limits (R-02) |
| `label_en`, `label_ar` | text | not null, shown in the settings console (A-04) |
| `description_en`, `description_ar` | text | not null |
| `created_at` | timestamptz | not null |

**`settings`**: the values.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | uuid | primary key |
| `key` | text | not null, foreign key to `setting_definitions` |
| `scope` | text | not null, `CHECK (scope IN ('platform','venue'))` |
| `venue_id` | uuid, null | `CHECK ((scope = 'platform') = (venue_id IS NULL))`; foreign key to `venues` added in S2 |
| `value` | jsonb | not null, the JSON value (number, boolean, string, array or object) |
| `min_value`, `max_value` | jsonb, null | admin limits; platform rows only |
| `allowed_values` | jsonb, null | for `enum` settings; platform rows only |
| `version` | integer | not null, default 1, increases by 1 on every change |
| `updated_by_type` | text | not null, `CHECK (updated_by_type IN ('system','admin','partner_user'))` |
| `updated_by_id` | uuid, null | |
| `created_at`, `updated_at` | timestamptz | not null |

- `CHECK (scope = 'platform' OR (min_value IS NULL AND max_value IS NULL AND allowed_values IS NULL))`: only admins set limits.
- Unique partial indexes: `(key) WHERE scope = 'platform'` and `(key, venue_id) WHERE scope = 'venue'`.
- Index `(venue_id) WHERE scope = 'venue'`.

### 6.2 Reading, limits and caching

- `SettingsService.get(key)` returns the platform value. `get(key, { venueId })` returns the venue's value if one exists, otherwise the platform value.
- **Limits (R-02).** Writes check the value against its type and against the platform row's `min_value`, `max_value` and `allowed_values` in the same transaction. When an admin narrows a limit in S4, venue values that fall outside it are reported to the admin before saving; the console decides what to do with them (designed in S4).
- **Cache.** Every API container keeps all platform settings in memory, loaded at start. A write publishes `settings:changed` on Redis, and every container reloads at once. As a safety net, containers also reload every 60 seconds. Venue values are cached in Redis under `settings:venue:{venueId}`, cleared on write. A change in the back office therefore reaches the app within seconds, with no release (R-01's acceptance check).
- **Versioning.** Each row has a `version`. The settings console (S4) sends the version it read, and a write with an older version gets `409 VERSION_CONFLICT`, so two admins never overwrite each other silently. The full history (R-04) is the `setting_changes` table in S4. Bookings copy the rules they were made under (R-03), so a later change never alters them.
- **Changes before S4.** There is no console until S4. S1 values change through a server command (`settings:set <key> <value>`) that validates limits and writes an activity log entry with `actor_type = 'system'`.

### 6.3 Settings seeded in S1

The PRD fixes some of these values but does not list them as changeable. As the owner asked, they are admin settings anyway, so they can be tuned without a release.

| Key | Default | Admin limits | Source |
| --- | --- | --- | --- |
| `auth.otp.code_ttl_seconds` | 300 | 60 to 900 | C-02: expires after 5 minutes |
| `auth.otp.max_wrong_attempts` | 5 | 3 to 10 | C-02: five wrong tries |
| `auth.otp.lock_minutes` | 15 | 5 to 1440 | C-02: lock for 15 minutes |
| `auth.otp.resend_cooldown_seconds` | 60 | 30 to 600 | security baseline |
| `auth.otp.max_requests_per_phone_per_hour` | 5 | 1 to 20 | security baseline: per phone |
| `auth.otp.max_requests_per_device_per_hour` | 10 | 1 to 50 | security baseline: per device |
| `auth.otp.allowed_country_codes` | `["EG"]` | any ISO 3166-1 codes | proposal: Egyptian numbers only at launch |
| `auth.admin.max_wrong_attempts` | 5 | 3 to 10 | A-01 |
| `auth.admin.lock_minutes` | 15 | 5 to 1440 | A-01 |
| `auth.account_deletion.reauth_window_minutes` | 10 | 1 to 60 | C-04 proposal |

## 7. Customer sign-in with a phone code (C-02)

### 7.1 Flow

1. The app sends `POST /v1/auth/otp/request` with the phone, its installation ID and the chosen language.
2. The API checks the phone format and country, the lock, the cooldown and the rate limits. It ends any open challenge for that phone, makes a 6-digit code with a secure random generator, stores its HMAC, and asks `OtpSender` to send it.
3. `OtpSender` tries WhatsApp first. If WhatsApp refuses the message, it sends by SMS straight away. If WhatsApp accepts it but later reports it as failed (delivery receipt webhook), the API sends the same code by SMS if the challenge is still open. The customer can also ask for SMS on a resend (`channel: sms`). The response says which channel was used.
4. The app sends `POST /v1/auth/otp/verify` with the code and its device details. On success: customer created if new, device upserted, session started, tokens returned. On a wrong code: the counter goes up, and at the limit the phone is locked and the challenge ends.

### 7.2 Rules

- **Expiry, tries and lock** come from the settings in section 6.3. The lock is per phone number and covers all of its challenges, so asking for a new code does not reset the count.
- **Rate limits per phone and per device** (security baseline) come from settings. Because an installation ID is easy to change, there is also a per-IP limit from configuration.
- **No account discovery.** `request` answers the same for new and existing numbers.
- **Codes never appear** in logs, analytics, error messages or the database.
- **Comparison** of hashes is constant-time.

### 7.3 Providers

```ts
interface OtpChannelProvider {
  readonly channel: 'whatsapp' | 'sms';
  send(input: { to: string; code: string; language: 'en' | 'ar' }): Promise<{ messageId: string }>;
}
```

- Providers: `WhatsAppProvider`, `SmsProvider` and `FakeProvider`, chosen by configuration (`OTP_WHATSAPP_PROVIDER`, `OTP_SMS_PROVIDER`).
- **The fake provider** sends nothing and records the last code per phone in Redis, readable only through a test helper. In the `local` and `test` environments it can also accept a fixed code from `FAKE_OTP_CODE`, so Maestro and Playwright tests can sign in. The API refuses to start if the fake provider is configured in staging or production. The demo account for store reviewers (Q-07) is a separate allow-list designed before the first public release.
- **We make the codes, providers only deliver them.** Services that generate and check codes themselves (such as "Verify" products) would duplicate the lock and expiry rules and hide them from our settings, so they are not a good fit unless they accept our own code.
- **Vendor not chosen.** Options for the owner, all able to send WhatsApp authentication templates and SMS to Egypt:
  1. **Meta WhatsApp Cloud API directly, plus a local Egyptian SMS aggregator.** Usually the lowest cost per message. Two contracts and two integrations.
  2. **One regional provider for both** (for example Infobip, or Cequens, an Egyptian provider). One contract, one integration, local support, usually a small markup.
  3. **One global provider for both** (for example Twilio or Vonage). Good tooling, usually the highest SMS price to Egypt.

  Either way, Egyptian SMS sender IDs must be registered, which can take weeks, and WhatsApp needs a verified Meta Business account with approved authentication templates in English and Arabic. Both should start before S1 is released to testers. Until then, development and CI use the fake provider. I could not check prices from this environment; the owner should request quotes.

### 7.4 Rate limiter

A small `RateLimiter` service in core uses Redis fixed windows (`INCR` with `EXPIRE` in one Lua call) under keys such as `rl:otp:phone:{hmac(phone)}`. Phone numbers in Redis keys are HMACs, not plain. Limits are read from settings at call time. Redis runs with append-only persistence, so locks survive a restart.

## 8. Sessions and tokens

### 8.1 Tokens

- **Access token**: JWT signed with EdDSA (Ed25519) using `jose`. Lifetime 15 minutes (`ACCESS_TOKEN_TTL_SECONDS`). Claims: `sub`, `typ` (`customer` or `admin`), `sid`, `auth_time`, `amr`, `iss`, `aud` (`feengo-app` or `feengo-admin`), `iat`, `exp`. The header carries `kid`, so keys rotate without signing anyone out: the newest key signs, and all listed keys verify.
- **Refresh token**: 256 random bits, base64url, prefixed `frt_` so secret scanners can spot leaks. Only its SHA-256 hash is stored. Single use: every refresh returns a new one and marks the old one used (rotation). Replaying a used token after `REFRESH_REUSE_GRACE_SECONDS` (10) ends the whole session (theft detection). The grace period lets a retried request after a dropped connection succeed.
- **Revocation before expiry.** Logout, deletion, suspension and admin disabling add the session ID to a Redis deny-list (`sid:revoked:{sid}`) that lives as long as an access token. The guard checks it on every request. This is shared state in Redis, not server memory, so the API stays stateless.

| | Customers (app) | Admins (back office) |
| --- | --- | --- |
| Refresh token lifetime | 60 days, renewed on each use (`CUSTOMER_REFRESH_TTL_DAYS`) | 30 minutes idle (`ADMIN_REFRESH_IDLE_MINUTES`) |
| Absolute session limit | 180 days, then sign in again (`CUSTOMER_SESSION_MAX_DAYS`) | 12 hours (`ADMIN_SESSION_MAX_HOURS`) |

These are security configuration, not business rules, so they are environment variables rather than settings.

### 8.2 The app (secure storage)

- The refresh token is kept only in `flutter_secure_storage`: the iOS Keychain with "after first unlock, this device only" (so it never moves to another phone through a backup), and Android storage encrypted with a key in the Android Keystore. The access token is kept only in memory.
- At start-up the app refreshes to get an access token. A single Dio interceptor refreshes once when a call gets `401 UNAUTHENTICATED` and makes other calls wait for that one refresh, so two refreshes never race.
- The iOS Keychain survives uninstalling the app. On the first launch after an install, the app clears its Keychain entries (a flag in ordinary preferences, which do not survive uninstalling).
- Installation ID: a random UUID made on first launch and kept in secure storage.

### 8.3 The websites (never readable by page scripts)

- The browser only talks to its own Next.js server. Next.js route handlers call `/v1/admin/auth/...` and `/v1/auth/...`, then set two cookies: `__Host-feengo_at` (access token) and `__Host-feengo_rt` (refresh token), both `HttpOnly; Secure; SameSite=Strict; Path=/`. The `__Host-` prefix stops subdomains from setting or reading them.
- Server components and server actions read the cookie and call the API with `Authorization: Bearer`. When the access token has expired, the Next.js server refreshes it and resets the cookies.
- CSRF: `SameSite=Strict`, plus a check of the `Origin` header on every state-changing route handler (Next.js server actions already check it).
- The Next.js request proxy (formerly middleware) sends any request without a session cookie to the sign-in page, so no admin screen renders without a full session (A-01). The API still checks every request itself.
- The partner dashboard (S2) uses the same pattern with its own cookies and `aud`.

## 9. Admin sign-in (A-01) and the activity log (A-11)

### 9.1 Proposal: email, password and authenticator code

1. `POST /v1/admin/auth/sign-in` with email and password. Argon2id check. On success: an opaque `mfaToken`, kept in Redis for 5 minutes, single use, 3 tries.
2. `POST /v1/admin/auth/totp/verify` with the `mfaToken` and a 6-digit TOTP code (RFC 6238: SHA-1, 30-second steps, one step of clock drift allowed). A code is accepted once (`totp_last_used_step`). On success: tokens with `amr = ["pwd","otp"]`, and an `admin.signed_in` log entry.
3. Wrong passwords and wrong codes both count toward `auth.admin.max_wrong_attempts`, per email address, including unknown addresses (counted in Redis), so a lock never reveals whether an account exists. At the limit, an `admin.locked` entry is logged.

- Passwords: at least 12 characters, at most 200. Hashed with Argon2id using the library's current defaults.
- TOTP secrets: 20 random bytes, encrypted with AES-256-GCM using a key from `TOTP_ENCRYPTION_KEYS` (Node's built-in crypto). The key ID is stored so keys can rotate.
- Every admin endpoint requires a token with `typ = admin` and `otp` in `amr`.

### 9.2 Admin accounts come only from a seed command

There is no sign-up or invite endpoint. Server commands, run inside the API container (`node dist/cli.js ...`), each write an activity log entry with `actor_type = 'system'`:

- `admin:create --email --name`: asks for the password without showing it, makes the TOTP secret, and prints the `otpauth://` link and the secret once, for the owner to add to an authenticator app. They are never stored in plain text or logged.
- `admin:reset-totp --email`: for a lost phone. Ends all of that admin's sessions.
- `admin:disable --email`: ends all sessions.

### 9.3 Activity log (A-11)

- `ActivityLog.record()` is the only writer, called in the same transaction as the action. S1 actions: `admin.created`, `admin.signed_in`, `admin.signed_out`, `admin.sign_in_failed` (known email only), `admin.locked`, `admin.totp_reset`, `admin.disabled`. Each later slice adds its own, such as `venue.approved` or `booking.refunded`.
- `GET /v1/admin/activity-log` reads it, newest first, with filters. Nothing in the API can change or delete an entry, and the database refuses to (section 5.3).
- Possible later strengthening: a hash chain (each row stores a hash of the previous one) so that even a database superuser's tampering would show. Not needed for S1.

## 10. Account deletion (C-04)

**Proposal, subject to the owner and a lawyer.**

`DELETE /v1/me`, from a screen in the app (Apple and Google both require deletion inside the app, Q-07):

1. The customer must have signed in within the `auth.account_deletion.reauth_window_minutes` setting (default 10). If not, the API returns `REAUTH_REQUIRED` and the app asks for a new phone code first. This stops someone holding an unlocked phone from deleting the account by accident or on purpose.
2. In one transaction: `phone_e164`, `name` and `email` set to null, `status = 'deleted'`, `deleted_at = now()`. Devices (and push tokens) deleted. All refresh tokens deleted, and session IDs added to the deny-list. OTP challenges for that phone deleted.
3. From later slices: bookings, event requests, payments and refunds are **kept** with the customer ID and no personal details, because venues need their booking history and the business needs payment records for accounting and tax. Reviews (S7) stay with "Former customer" as the author, or are removed; to be decided in S7.
4. The app calls Firebase Analytics' `resetAnalyticsData()` and signs out. The API never sends personal data to Firebase, and S1 does not set a Firebase user ID, so there is nothing else to delete there.
5. The same phone number can then sign up again as a new, empty account.

Open points for the owner and lawyer (section 22): whether a keyed hash of the phone should be kept so that no-show strikes (C-13) cannot be reset by deleting and signing up again; whether deletion should be blocked while a paid deposit is pending (from S6); and how long anonymised records are kept.

## 11. Mobile app

### 11.1 State management and navigation

- **Riverpod 3 (`flutter_riverpod`)**, written by hand without code generation in S0 and S1. It is actively maintained (3.5.0 published 2026-11-06), does not depend on the widget tree, is easy to test by overriding providers, and suits async data such as sessions and API calls. Bloc was the other candidate; `flutter_bloc`'s last release was May 2025, a long gap.
- **go_router 18**, published by the Flutter team. One route table, deep links from S3 (C-08), and a redirect guard for signed-in screens.
- **C-01 return path.** A screen that needs an account is marked in the route table. A visitor who opens it is sent to `/sign-in?from=<original route>`, and after a successful sign-in the router returns to `from`. Booking (S4) uses the same mechanism.

### 11.2 Folder structure

```
apps/mobile/
  lib/
    main_dev.dart, main_staging.dart, main_prod.dart   one entry point per flavor
    app/            app widget, router, theme from tokens, localization setup
    core/           config, http (Dio client, interceptors, error mapping), secure storage,
                    preferences, analytics, logging (no personal data)
    features/
      home/         S0 placeholder
      settings/     language and theme switch (S0)
      auth/         S1: phone entry, code entry
      profile/      S1: profile, delete account
        data/         API calls and models
        application/  Riverpod providers and state
        presentation/ screens and widgets; no business logic
    l10n/           app_en.arb (template), app_ar.arb
  test/  integration_test/  maestro/ (C11)
```

### 11.3 Configuration and flavors

- Three flavors, `dev`, `staging` and `prod`, each with its own app ID suffix and its own Firebase project, so test data never mixes with real data.
- Settings per flavor (API base URL, environment name) come from `--dart-define-from-file=config/<flavor>.json`. The app holds no secrets; anything in an app can be extracted.
- Firebase config files per flavor (`google-services.json`, `GoogleService-Info.plist`) are committed. They identify the project and are not secrets; their API keys are restricted to FeenGo's app IDs in the Google Cloud console.
- Language and theme choices are kept in `shared_preferences`, so they are remembered before sign-in (C-03). After sign-in the language is also saved to the profile, so the server can send messages in it.

### 11.4 Standards that the architecture relies on

- All text from ARB files; direction-aware widgets only (`EdgeInsetsDirectional`, `AlignmentDirectional`).
- Text scales with the system setting; the app never clamps `textScaler` (Q-04).
- Every network call has a timeout, maps `Problem.code` to a translated message, and offers a retry.
- Models are written by hand in S1 (a handful of small types). If S3 brings many models, `json_serializable` will be proposed then.

## 12. Websites

- **Next.js 16 App Router, React 19.3, TypeScript strict.** Each app runs in `output: 'standalone'` mode inside its own Docker container.
- **Styling:** CSS Modules plus the CSS custom properties generated from the tokens. Logical properties only (`margin-inline-start`, never `margin-left`). No CSS framework, which keeps the token file the only source of design values.
- **Fonts:** IBM Plex Sans Arabic from `packages/design-tokens/fonts`, loaded with `next/font/local`, so no request goes to Google at run time.
- **Language:** next-intl without locale prefixes in the URL. The choice is kept in a cookie, English by default; the root layout sets `<html lang dir>` on the server, so there is no flash of the wrong direction.
- **Data:** server components fetch through a typed client generated from `openapi.yaml` (openapi-typescript and openapi-fetch, S1 onwards). Browser code never calls the API directly.
- **Partner dashboard** works at 360 pixels wide first; the back office is desktop first but must still work on a tablet.

## 13. Design tokens

**Source.** `packages/design-tokens/tokens/*.json` in the W3C Design Tokens Community Group format (`$value`, `$type`):

- `base.json`: the raw palette (the five provisional colours from ROADMAP.md), type scale, spacing, radius, motion.
- `theme.light.json`, `theme.dark.json`: semantic roles (`color.background`, `color.on-background`, `color.primary`, `color.on-primary`, ...) that point to base values.
- `fonts/`: IBM Plex Sans Arabic files and their Open Font License. It covers both Arabic and Latin.

**Build.** Style Dictionary 5 (`pnpm --filter @feengo/design-tokens build`) writes:

| Output | Used by |
| --- | --- |
| `dist/css/tokens.css`: custom properties under `:root[data-theme=light]` and `[data-theme=dark]` | both websites |
| `dist/ts/tokens.ts`: typed constants | websites, wherever CSS is not enough |
| `flutter/lib/feengo_design_tokens.dart`: `FeenGoColors.light` and `.dark`, type scale, spacing, plus the fonts declared in its `pubspec.yaml` | the app, which builds its `ThemeData` from it |

- Generated files are committed, so the app builds without Node and reviewers see exactly what changed. CI rebuilds and fails if the committed output differs.
- **Contrast check.** The build fails if a declared text and background pair in either theme is below WCAG AA (4.5 to 1 for body text, 3 to 1 for large text and interface parts), which protects Q-04 on every token change.
- **Swapping the design later is a single edit:** the designer changes the token JSON in `packages/design-tokens`, runs the build and commits. No app code changes, because apps refer only to semantic roles. This is why nothing in S0 waits for the final visual identity.

**Finding on the provisional palette** (for ui-ux-designer, not a blocker): primary `#B3204F` on the dark neutral `#1C2430` is 2.41 to 1, and success `#0E6B5E` on dark is 2.44 to 1, both below AA, so the dark theme needs lighter tints for those roles. Accent `#F2A93B` on the light neutral is 1.86 to 1, so it cannot be used for text on light backgrounds. White on primary is 6.49 to 1 and dark neutral on light neutral is 14.52 to 1, both fine.

## 14. Translations

- **Each product owns its files.** The app: `apps/mobile/lib/l10n/app_en.arb` (template) and `app_ar.arb`, built by Flutter's `gen-l10n`. Each website: `messages/en.json` and `messages/ar.json` for next-intl. The API: `apps/api/src/i18n/en.json` and `ar.json`, only for text the server sends (code messages, notifications from S4).
- **One message syntax everywhere: ICU MessageFormat** (both ARB and next-intl use it), for plurals and gender, which Arabic needs.
- **Not shared as a package.** The three audiences (customers, venues, admins) use different words, and a shared package would couple releases. Shared terms are kept consistent through a glossary at `docs/design/glossary.md`, owned by ui-ux-designer.
- **Error codes** from the API are translated by each client under keys `error.<CODE>`.
- **CI checks** that every key exists in both languages and that no placeholder is missing: `gen-l10n` with an untranslated-messages file that must be empty for the app, and a small script (no dependency) for the JSON files.
- **WhatsApp templates** for codes are approved by Meta per language; their names live in configuration, their text in Meta's console, with a copy in `apps/api/src/i18n` for review.
- **Bilingual database data** (from S2): pairs of columns, `name_en` and `name_ar`, both `NOT NULL` where the field is required. Simple to index and search; a third language would be a migration, which the PRD does not foresee.

## 15. Analytics and deep links (Q-06, C-08)

### 15.1 Analytics

- Firebase Analytics in the app only, one Firebase project per environment. The websites send no analytics in S0 and S1.
- **S0 test event (C7):** `foundation_test`, sent once when the placeholder home screen first appears, with parameters `language` and `theme`. Checked in Firebase DebugView on a real iPhone and Android phone.
- **Event plan for Q-06**, using Google Analytics' recommended names where they exist:

| Q-06 event | Name | Slice |
| --- | --- | --- |
| Sign-up | `sign_up` (method `phone`), and `login` for returning customers | S1 |
| Search | `search` | S3 |
| Venue view | `view_venue` | S3 |
| Booking | `booking_created` | S4 |
| Request | `event_request_created` | S5 |
| Quote | `quote_viewed`, `quote_accepted` | S5 |
| Payment | `deposit_paid` | S6 |
| Review | `review_submitted` | S7 |

- **Never** send phone numbers, names, emails, codes or free text to analytics. S1 does not set a Firebase user ID.
- **Campaign attribution.** On Android, Firebase Analytics reads the Play Install Referrer and records the install campaign itself. On iOS, campaign parameters (`utm_*`) arrive on the opening link; the app logs them on a `campaign_open` event and as a user property. Neither needs Apple's tracking permission prompt, because no advertising identifier is used.
- Whether customers must be asked for consent before analytics is a question for the lawyer (section 22). The architecture allows starting with collection off and switching it on after consent.

### 15.2 Deep links for shared venues (C-08, built in S3)

Firebase Dynamic Links shut down on 25 August 2025, so it is not an option.

**Proposal: platform links plus the Play Install Referrer, at no extra cost.**

- One web address per venue, for example `https://<domain>/v/<venue-slug>`.
- iOS Universal Links (`apple-app-site-association`) and Android App Links (`assetlinks.json`) open that address in the app when it is installed, handled by `app_links` and go_router.
- When the app is not installed, the address serves a small page with the venue's name and photo and store badges; on Android the Play link carries the venue in the install referrer, so the app opens the venue after installing (`play_install_referrer` package).
- **Limit:** on iOS, a person who installs from the link lands on the home screen, not the venue. Apple offers no free way to pass data through an install.

**Paid alternative:** a linking service (for example Branch or AppsFlyer OneLink) also opens the venue after an iOS install and adds attribution reports. They have had free tiers with limits and paid plans that typically start in the hundreds of US dollars a month; I could not check current prices from here. Recommendation: start with the free approach and revisit if marketing needs iOS deferred links.

Needs before S3: the owner's domain, Apple Team ID and Android signing fingerprints. Where the link page is hosted is decided in S3's architecture update.

## 16. Supported phones (Q-02) and accessibility (Q-04)

Checked on 2026-11-18 against the sources:

| Component | iOS minimum | Android minimum | Source |
| --- | --- | --- | --- |
| Flutter 3.50.0 new-app template | 15.0 | API 24 (Android 7.0), target and compile API 36 | flutter/flutter at tag 3.50.0: `FlutterExtension.kt`, iOS project template |
| firebase_core 5.2.0, firebase_analytics 13.1.0 | 15.0 | API 24 | plugin `Package.swift`, podspec, `local-config.gradle` |
| flutter_secure_storage 11.2.0 | (no higher) | API 24 | plugin `build.gradle` |
| app_links 7.2.2 (S3) | 13.0 | API 24 | plugin sources |

**Result: no conflict.** Q-02's iOS 15 equals the highest minimum (Firebase and Flutter), and Android 8 (API 26) is above every minimum of 24. The app sets `minSdk = 26` and the iOS deployment target to 15.0.

Things to know:

- **Firebase's Apple SDK is now Swift Package Manager only.** FlutterFire pins its CocoaPods path at Firebase iOS SDK 12.19.3 because new releases stopped publishing to CocoaPods in October 2026; firebase_core 5.x uses Firebase iOS SDK 13 through Swift Package Manager. Flutter 3.50 turns Swift Package Manager on by default, so the iOS build must keep it on.
- Flutter 3.50 needs Xcode 15 or later and recommends 16; App Store uploads need Apple's current Xcode. release-manager pins the macOS runner image and Xcode version in C10 and confirms the iOS 15 deployment target still builds with it.
- Q-02 is marked as a proposal in the PRD; raising the Android minimum later only reduces reach and needs no design change.

**Q-04.** Text follows the phone's text size (no clamping in the app; `rem` units on the websites). Contrast is enforced by the token build (section 13). Golden tests and Playwright screenshots at the largest text size are part of each slice's review.

## 17. Pinned versions

All checked on **2026-11-18** from the sources the owner named: npm registry metadata (`npm view`), pub.dev's API, the Flutter release feed, Node's release index and Docker Hub. npm download counts and GitHub statistics were not reachable from this environment, so "usage" for npm packages rests on each package's standing and release history; pub.dev figures are its own 30-day download counts.

### 17.1 Runtimes, services and tools

| Item | Version | Released | Usage and maintenance | Why this version |
| --- | --- | --- | --- | --- |
| Node.js | 26.13.1 | 2026-11-10 | Active LTS ("Lithium"); maintenance LTS runs into 2029 | Current active LTS. Node 24 is in maintenance; 27 is not LTS. Image `node:26.13.1-alpine3.24`. |
| pnpm | 12.21.0 | 2026-11-13 | Current major since 2026-08; pnpm 10 and 11 still get fixes | Latest stable, works on Node 26; pinned through `packageManager`, so the container's pnpm 10.28 switches to it |
| TypeScript | 6.0.3 | 2026-04-16 | Microsoft; 7.0 (the native compiler) is out | **Not 7.0.2**: typescript-eslint 8.73 supports TypeScript below 6.1, and the NestJS 12 template uses `^6.0.2`. Move to 7 when the tools support it. |
| PostgreSQL | 18.7 | image 2026-11-15 | Current major; 19 is in release candidate | Newest stable major. Image `postgres:18.7-alpine3.24`. Nothing in the schema needs 18-only features, so a host on 17 would also work. |
| Redis | 8.10.3 | image 2026-11-11 | Current stable line; 8.12 is in release candidate | Image `redis:8.10.3-alpine3.23`, run unmodified as a service. Managed hosts may offer Valkey, a Redis-compatible fork, which works the same with our client. |
| Flutter | 3.50.0 (Dart 3.14.0) | 2026-11-11 | Google, quarterly stable releases | Newest stable; FlutterFire 5.2.0 already fixes Flutter 3.50 issues. Take 3.50 hotfixes as they come. |
| OpenAPI lint | @redocly/cli 2.80.0 | 2026-11-18 | Very active (61 releases in 90 days) | Contract lint in CI from C3 |
| Mobile end-to-end | Maestro | not checked | | Its download site was not reachable from here; qa-tester pins and records the version in C11 |

### 17.2 Key libraries (full lists in section 18)

| Library | Version | Last release | Usage and maintenance | Why |
| --- | --- | --- | --- | --- |
| NestJS (`@nestjs/core` and family) | 12.5.1 | 2026-11-16 | The standard structured Node framework; 12.x since 2026-08 with five minor releases; 11.x still patched | Current major; its template is ES modules with Vitest, which this design follows |
| Kysely | 0.29.9 | 2026-11-12 | 7 releases in 90 days, two lines maintained; pre-1.0 numbering but a stable API since 2023 | Section 5.1 |
| pg | 8.23.1 | 2026-09-30 | The standard PostgreSQL driver for Node | Kysely's Postgres dialect uses it |
| ioredis | 6.0.0 | 2026-07-31 | Long-standing Redis client, also used by BullMQ | Lua scripts, pub/sub and reconnects built in |
| zod | 4.6.7 | 2026-10-12 | Very widely used; 13 releases in 90 days | One schema library for config and request validation; `@nestjs/config` accepts it directly |
| jose | 6.2.17 | 2026-11-09 | The standard JOSE/JWT library for Node; no dependencies | EdDSA signing and key rotation (`@nestjs/jwt` does not support EdDSA) |
| argon2 | 0.45.2 | 2026-11-03 | Long-standing Node binding with prebuilt binaries, including Alpine | Argon2id is the current recommendation for passwords |
| otplib | 13.6.0 | 2026-10-31 | Long-standing TOTP library (since 2014), rewritten in 13.x | RFC 6238 codes, rather than writing our own |
| libphonenumber-js | 1.13.16 | 2026-11-10 | The standard phone number library for JavaScript | Validates mobile numbers and their country |
| nestjs-pino, pino, pino-http | 5.3.2, 10.4.0, 11.0.0 | 2026-11-17, 2026-10-02, 2025-10-04 | The usual fast JSON logger for NestJS | Structured logs with request IDs and redaction |
| helmet | 8.3.0 | 2026-07-12 | The standard security headers middleware | Security headers |
| Vitest | 4.1.12 | 2026-10-15 | Very widely used; the 4.x line is still maintained after 5.0 | Matches the NestJS 12 template (`^4.1.2`); 5.x can follow once NestJS moves |
| Next.js | 16.4.6 | 2026-11-09 | Vercel; 20 releases in 90 days | Current stable major |
| React | 19.3.1 | 2026-10-14 | Meta | Required by Next.js 16 |
| next-intl | 4.15.1 | 2026-11-12 | The most used translation library for the App Router; 13 releases in 90 days | Server-side `lang` and `dir`, ICU messages |
| Playwright | 1.65.1 | 2026-11-13 | Microsoft | Named in STACK.md |
| ESLint, typescript-eslint, eslint-config-next | 10.15.0, 8.73.0, 16.4.6 | November 2026 | Standard | One linter for all TypeScript apps (NestJS's template now uses oxlint; one tool across the repository is simpler) |
| Style Dictionary | 5.8.0 | 2026-11-03 | The most used token build tool; supports the W3C token format | Section 13 |
| openapi-typescript, openapi-fetch | 7.13.0, 0.17.0 | both 2026-02-11 | Widely used; slower releases lately; its peer range still says TypeScript 5 | Types from the contract for the websites, S1. web-dev confirms generation under TypeScript 6 in the first S1 pull request; if it fails, types are written by hand and checked by contract tests. |
| flutter_riverpod | 3.5.0 | 2026-11-06 | 2,919 likes, 4.3 million downloads in 30 days | Section 11.1 |
| go_router | 18.1.4 | 2026-11-09 | Flutter team, Flutter Favourite, 5.5 million downloads in 30 days | Section 11.1 |
| firebase_core, firebase_analytics | 5.2.0, 13.1.0 | 2026-11-16 | Google, 6.1 and 2.6 million downloads in 30 days | Q-06 |
| firebase_crashlytics | 6.1.0 | 2026-11-16 | Google, Flutter Favourite | Crash reports (STACK.md), from the first tester release in S1 |
| flutter_secure_storage | 11.2.0 | 2026-09-16 | 4,512 likes, 6.2 million downloads in 30 days, 160 of 160 pub points | Keychain and Keystore storage for tokens |
| dio | 5.11.1 | 2026-09-04 | 8,373 likes, 5.3 million downloads in 30 days | Interceptors for token refresh, timeouts and retries |
| shared_preferences | 2.5.6 | 2026-10-05 | Flutter team | Language and theme choice |
| package_info_plus | 10.2.2 | 2026-10-01 | Flutter Community, Flutter Favourite | App version for device registration |
| intl, flutter_localizations | SDK-pinned (0.20.x) | | Dart and Flutter teams | `gen-l10n`; `intl` is declared as `any` so the Flutter SDK chooses the matching version |
| flutter_lints, mocktail | 6.0.0, 1.0.5 | 2025-05-27, 2026-04-10 | Flutter team; widely used | Lint rules; test doubles |

## 18. Dependency list per app

The owner's approval of this document approves exactly these lists. Versions are exact. Anything else needs a new approval.

### 18.1 Root workspace (release-manager)

| Package | Version | Kind | Increment |
| --- | --- | --- | --- |
| prettier | 3.10.1 | dev | C3 |
| @redocly/cli | 2.80.0 | dev | C3 |
| eslint | 10.15.0 | dev | C3 |
| typescript-eslint | 8.73.0 | dev | C3 |
| typescript | 6.0.3 | dev | C3 |

### 18.2 `apps/api` (backend-dev)

| Package | Version | Kind | Increment |
| --- | --- | --- | --- |
| @nestjs/common | 12.5.1 | runtime | C2 |
| @nestjs/core | 12.5.1 | runtime | C2 |
| @nestjs/platform-express | 12.5.1 | runtime | C2 |
| @nestjs/config | 12.1.1 | runtime | C2 |
| reflect-metadata | 0.2.2 | runtime | C2 |
| rxjs | 7.8.2 | runtime | C2 |
| zod | 4.6.7 | runtime | C2 |
| nestjs-pino | 5.3.2 | runtime | C2 |
| pino | 10.4.0 | runtime | C2 |
| pino-http | 11.0.0 | runtime | C2 |
| helmet | 8.3.0 | runtime | C2 |
| pg | 8.23.1 | runtime | C2 |
| kysely | 0.29.9 | runtime | C2 (connection), C4 (migrator) |
| ioredis | 6.0.0 | runtime | C2 |
| jose | 6.2.17 | runtime | S1 |
| argon2 | 0.45.2 | runtime | S1 |
| otplib | 13.6.0 | runtime | S1 |
| libphonenumber-js | 1.13.16 | runtime | S1 |
| @nestjs/cli | 12.0.13 | dev | C2 |
| @nestjs/schematics | 12.0.13 | dev | C2 |
| @nestjs/testing | 12.5.1 | dev | C2 |
| typescript | 6.0.3 | dev | C2 |
| @types/node | 26.6.6 | dev | C2 |
| @types/express | 5.0.6 | dev | C2 |
| @types/pg | 8.23.1 | dev | C2 |
| vitest | 4.1.12 | dev | C2 |
| @vitest/coverage-v8 | 4.1.12 | dev | C2 |
| vite | 8.3.8 | dev | C2 (Vitest's peer) |
| supertest | 7.3.2 | dev | C2 |
| @types/supertest | 7.2.1 | dev | C2 |
| pino-pretty | 13.2.0 | dev | C2 (readable local logs only) |
| kysely-codegen | 0.20.0 | dev | C4 |
| ajv | 8.20.0 | dev | C11 (contract tests: responses checked against `openapi.yaml`) |
| ajv-formats | 3.0.1 | dev | C11 |
| yaml | 2.9.1 | dev | C11 (reads `openapi.yaml` in tests) |

### 18.3 `apps/admin-web` and `apps/partner-web` (web-dev), the same list for each

| Package | Version | Kind | Increment |
| --- | --- | --- | --- |
| next | 16.4.6 | runtime | C8, C9 |
| react | 19.3.1 | runtime | C8, C9 |
| react-dom | 19.3.1 | runtime | C8, C9 |
| next-intl | 4.15.1 | runtime | C8, C9 |
| @feengo/design-tokens | workspace | runtime | C8, C9 |
| openapi-fetch | 0.17.0 | runtime | S1 (admin-web), S2 (partner-web) |
| typescript | 6.0.3 | dev | C8, C9 |
| @types/node | 26.6.6 | dev | C8, C9 |
| @types/react | 19.3.0 | dev | C8, C9 |
| @types/react-dom | 19.3.0 | dev | C8, C9 |
| eslint-config-next | 16.4.6 | dev | C8, C9 |
| vitest | 4.1.12 | dev | C8, C9 |
| vite | 8.3.8 | dev | C8, C9 |
| @vitejs/plugin-react | 6.3.0 | dev | C8, C9 |
| jsdom | 31.0.1 | dev | C8, C9 |
| @testing-library/react | 16.3.3 | dev | C8, C9 |
| @testing-library/jest-dom | 7.0.1 | dev | C8, C9 |
| @playwright/test | 1.65.1 | dev | C8, C9 (one smoke test), C11 |
| openapi-typescript | 7.13.0 | dev | S1 (admin-web), S2 (partner-web) |

### 18.4 `packages/design-tokens` (ui-ux-designer)

| Package | Version | Kind | Increment |
| --- | --- | --- | --- |
| style-dictionary | 5.8.0 | dev | C5 |

Assets, not packages: IBM Plex Sans Arabic font files with their Open Font License. The generated Dart package `feengo_design_tokens` depends only on the Flutter SDK.

### 18.5 `apps/mobile` (mobile-dev)

| Package | Version | Kind | Increment |
| --- | --- | --- | --- |
| flutter, flutter_localizations | SDK | runtime | C6 |
| intl | any (SDK chooses) | runtime | C6 |
| feengo_design_tokens | path `../../packages/design-tokens/flutter` | runtime | C6 |
| flutter_riverpod | 3.5.0 | runtime | C6 |
| go_router | 18.1.4 | runtime | C6 |
| shared_preferences | 2.5.6 | runtime | C6 |
| firebase_core | 5.2.0 | runtime | C7 |
| firebase_analytics | 13.1.0 | runtime | C7 |
| flutter_secure_storage | 11.2.0 | runtime | S1 |
| dio | 5.11.1 | runtime | S1 |
| package_info_plus | 10.2.2 | runtime | S1 |
| firebase_crashlytics | 6.1.0 | runtime | S1 |
| flutter_test, integration_test | SDK | dev | C6, C11 |
| flutter_lints | 6.0.0 | dev | C6 |
| mocktail | 1.0.5 | dev | C11 |

Expected in later slices, **not** approved now: `app_links` 7.2.2 and `play_install_referrer` 0.6.0 (S3, C-08), `google_maps_flutter` (S3), `firebase_messaging` (S4), BullMQ for background jobs (S4), `json_serializable` if models grow (S3).

### 18.6 CI tools (release-manager, C3 and C10)

GitHub Actions maintained by GitHub (`actions/checkout`, `actions/setup-node`, `actions/cache`), `pnpm/action-setup`, `subosito/flutter-action` for Flutter, and Google's `osv-scanner` action for the dependency scan of both npm and pub packages. release-manager pins each to a full commit SHA in C3 and lists them in the pull request.

## 19. Environments, configuration and secrets

### 19.1 Environments

| Environment | Where | Data | Code provider | Firebase | From |
| --- | --- | --- | --- | --- | --- |
| `local` | each developer's machine, Docker Compose | throwaway | fake | `feengo-dev` | C1 |
| `test` | CI, service containers | made and destroyed per run | fake | none | C3 |
| `staging` | the chosen host | sample venues, testers | real vendor, test numbers | `feengo-staging` | S1, once the host is chosen |
| `production` | the chosen host, separate project or account | real | real vendor | `feengo-prod` | before the first public release (after S6) |

- Each hosted environment has its own database, Redis, keys, Paymob mode (from S6) and Firebase project. Nothing is shared between staging and production.
- Proposal: no separately hosted "development" environment. Local Compose plus CI covers development, and testers use staging. Production is set up shortly before it is needed, to save cost.

### 19.2 Configuration

- The API reads only environment variables. A zod schema validates them at start-up, and the API refuses to start if one is missing or wrong (for example, the fake code provider outside `local` and `test`).
- `.env.example` at the root lists every variable with a comment and a harmless placeholder; release-manager keeps it current.
- API variables: `APP_ENV`, `PORT`, `LOG_LEVEL`, `TRUST_PROXY`, `DATABASE_URL` (app role), `DATABASE_MIGRATOR_URL`, `REDIS_URL`, `JWT_SIGNING_KEYS` (JSON list of Ed25519 keys with IDs), `JWT_ISSUER`, `ACCESS_TOKEN_TTL_SECONDS`, `CUSTOMER_REFRESH_TTL_DAYS`, `CUSTOMER_SESSION_MAX_DAYS`, `ADMIN_REFRESH_IDLE_MINUTES`, `ADMIN_SESSION_MAX_HOURS`, `REFRESH_REUSE_GRACE_SECONDS`, `OTP_CODE_PEPPER`, `PHONE_HASH_PEPPER`, `TOTP_ENCRYPTION_KEYS`, `OTP_WHATSAPP_PROVIDER`, `OTP_SMS_PROVIDER`, provider credentials, `FAKE_OTP_CODE` (local and test only), per-IP rate limits.
- Website variables: `APP_ENV`, `API_BASE_URL` (server side only; never `NEXT_PUBLIC_`).
- App: per-flavor JSON for `--dart-define-from-file`, no secrets.

### 19.3 Secrets

- Never in the repository. CI's secret scanning and the `frt_` prefix on refresh tokens help catch mistakes.
- **CI secrets** (store credentials later, deploy tokens) live in GitHub Environments (`staging`, `production`); production requires the owner's approval to deploy.
- **Runtime secrets** live in the host's secret store (section 20) and reach containers as environment variables.
- Rotation: JWT keys and TOTP encryption keys support several keys at once by ID, so they rotate without signing anyone out. Peppers rotate only with a planned migration.

## 20. Hosting options

All three run the same Docker images and meet the security baseline. **Prices are estimates from published list prices as I know them; I could not reach the vendors' price pages from this environment, so please confirm before choosing.** Figures are per month, before VAT.

None of them stores data in Egypt. Egypt's Personal Data Protection Law (Law 151 of 2020) limits transfers of personal data abroad, generally requiring an adequate level of protection in the destination and a licence or permit from the Personal Data Protection Centre. A lawyer must confirm what FeenGo needs before production holds real customer data (staging holds only testers' data). If the lawyer requires hosting in Egypt, none of these fits, and local data centre providers would need quotes.

### Option A: DigitalOcean, Frankfurt (recommended)

- **Shape:** App Platform runs the API and both websites as containers; Managed PostgreSQL; managed Redis-compatible store (Valkey); Spaces object storage for document uploads from S2.
- **Cost:** staging about USD 55 (small containers, single-node database, smallest cache). Production about USD 130 to 160 (two API containers, a 2 GB database with a standby node, cache, storage). Until production exists, about USD 55.
- **Baseline:** HTTPS with managed certificates on App Platform. Managed PostgreSQL is encrypted at rest, with daily backups and point-in-time recovery kept by the provider. App Platform encrypts environment variables marked as secrets. Staging and production in separate DigitalOcean projects, with separate databases and credentials.
- **Data location:** Germany (EU). Latency to Cairo is about 60 to 70 ms, which does not affect Q-01's server-time target.
- **Trade-off:** little to operate, at a moderate price. No Middle East region.

### Option B: Hetzner Cloud, Germany or Finland (cheapest)

- **Shape:** one virtual server per environment running Docker Compose: Caddy (automatic HTTPS), the API, both websites, PostgreSQL and Redis. Backups with pgBackRest to Hetzner Object Storage.
- **Cost:** staging about EUR 7 (2 vCPU, 4 GB). Production about EUR 30 to 35 (dedicated 2 vCPU, 8 GB server, volume, snapshots and object storage). Total about EUR 40.
- **Baseline:** HTTPS through Caddy and Let's Encrypt. Encryption at rest is **our job**: an encrypted (LUKS) volume for the database and pgBackRest's own encryption for backups; the volume key has to be entered or fetched when the server restarts. No managed secret store: secrets go from GitHub Environments into a root-only file at deploy time. Separate servers and projects per environment.
- **Data location:** Germany or Finland (EU).
- **Trade-off:** lowest price, but we patch the operating system, upgrade PostgreSQL, test restores and watch disks ourselves. Easy to get encryption or backups wrong.

### Option C: Google Cloud, Doha or Dammam (closest region)

- **Shape:** Cloud Run for the containers, Cloud SQL for PostgreSQL, Memorystore for Redis, Secret Manager, Cloud Storage.
- **Cost:** staging about USD 55 to 65 (containers scale to zero, but the smallest Redis is about USD 35 to 40 on its own). Production about USD 150 to 200 (one API container always on, a small dedicated database, Redis). Middle East regions cost somewhat more than US or EU regions.
- **Baseline:** HTTPS with managed certificates. Cloud SQL and backups are encrypted at rest, with point-in-time recovery. Secret Manager is a real secrets manager. Separate Google Cloud projects per environment, alongside the Firebase projects.
- **Data location:** Qatar or Saudi Arabia, the nearest to Egypt, with the lowest latency.
- **Trade-off:** the most complete security tooling and the same vendor as Firebase, but the highest price and more settings to learn.

**Recommendation: Option A.** It meets every baseline item with managed services, so nobody has to run database servers or backups by hand, and it costs about USD 55 a month until production is needed. Choose C if the lawyer prefers a region close to Egypt, or B if cost matters more than operating effort. Moving to AWS later is the same move from any of them: the same images and a database restore.

## 21. CI plan

GitHub Actions, owned by release-manager. One workflow with one job per app, run only when that app or what it depends on changed, plus a final summary job that branch protection requires (so skipped jobs never block a merge).

| Trigger | Runner | Jobs |
| --- | --- | --- |
| Every push to any branch, and every pull request | Linux | **api**: install, lint, type check, unit tests, API tests against Postgres and Redis service containers, migrations up, down, up, generated-types check, Docker build. **admin-web**, **partner-web**: install, lint, type check, unit tests, `next build`, Playwright smoke. **design-tokens**: build, stale-output check, contrast check. **mobile**: `flutter analyze`, `flutter test` (including golden tests), translation check, debug Android build. **contract**: Redocly lint of `openapi.yaml`. **security**: osv-scanner on all lockfiles, GitHub secret scanning. |
| Pull requests to `main` only, when `apps/mobile` or `packages/design-tokens` changed | macOS | **ios**: `flutter build ios --no-codesign` for the `staging` flavor |

- The macOS job runs on pull requests only because macOS minutes cost far more (GitHub bills them at a multiple of Linux minutes on private repositories), and an unsigned build is enough to catch iOS breakage before merging.
- Caches: the pnpm store, the pub cache, Gradle and the Flutter SDK.
- Deployment to staging (from S1) and signed tester builds with Fastlane are added by release-manager once the host is chosen; they are outside S0.

## 22. Questions for the owner

1. **Hosting.** Choose option A, B or C (section 20) before S1. I recommend A.
2. **Lawyer on data location.** Is hosting outside Egypt allowed for production, and what licence or permit does PDPL require? Staging can start before the answer.
3. **Code vendors.** Choose the WhatsApp and SMS providers (section 7.3) and start Egyptian SMS sender ID registration and the Meta Business verification now, because both take time.
4. **Vitest instead of Jest.** STACK.md lists Jest. NestJS 12's own template has moved to Vitest, and Jest is awkward with ES modules. I propose Vitest for the API and website unit tests (its test syntax is almost the same as Jest's). This changes a line in STACK.md, so it needs your approval.
5. **Account deletion (C-04).** Approve the proposal in section 10, including the "sign in again within 10 minutes" step. With a lawyer: should a keyed hash of the phone be kept so no-show strikes survive deletion? Should deletion wait while a paid deposit is pending (from S6)? How long are anonymised records kept?
6. **Analytics consent.** Must the app ask for consent before sending analytics, under PDPL? The design supports both.
7. **Phone numbers.** Accept Egyptian numbers (+20) only at launch? (`auth.otp.allowed_country_codes`, changeable later.)
8. **Name at sign-up.** May a new customer skip giving a name in S1? The proposal is yes: the app asks right after the first sign-in, the API allows it to be empty, and a name becomes required before the first booking in S4.
9. **Admin sign-in (A-01).** Approve email, password and authenticator app, with admin accounts created only by the seed command that you run on the server (section 9).
10. **Deep links (C-08, S3).** Approve the free approach (no venue after an iOS install), or budget for a paid linking service.
11. **Domain and app IDs.** Which domain will FeenGo use (for the API, the websites and shared links), and which app IDs (for example `app.feengo.customer`)? Needed before C6 for the IDs and before S1 staging for the domain.
12. **Firebase projects.** Please create `feengo-dev`, `feengo-staging` and `feengo-prod` (or allow release-manager to prepare the steps for you). Needed for C7.
13. **Environments.** Agree that there is no separately hosted development environment, and that production is set up shortly before the first public release.
14. **Billing tables.** DECISIONS says the billing structure exists in the database "from the start". The proposal is to create the plan tables in S2, together with the venues they belong to, switched off. Agree?
15. **Additional endpoint.** The contract adds `GET /v1/admin/me`, which was not in the S1 list, so the back office can show who is signed in after a page reload. Agree?

## 23. Traceability

| ID | Slice | Covered by | What the slice proves |
| --- | --- | --- | --- |
| Q-02 | S0 | Section 16; `minSdk 26` and iOS 15.0 in C6; CI iOS build C10 | The shell builds for and runs on iOS 15 and Android 8; the ROADMAP done-check runs it on a real iPhone and Android phone. No version conflict found. |
| Q-04 | S0 | Sections 11.4, 12 and 13 (contrast check in the token build); golden tests and Playwright screenshots at the largest text size (C6, C8, C9, C11) | Text follows the system size; every token pair passes WCAG AA in light and dark mode |
| Q-06 | S0 | Section 15.1; increment C7 | The `foundation_test` event arrives in Firebase DebugView from both platforms. The full event list grows with each slice. |
| C-01 | S1, partly | Section 11.1 (route guard and return path); no sign-in wall on the home screen | **S1 proves:** a visitor can open the app and use the home screen and the language and theme switch without an account; opening the profile, the only screen that needs an account in S1, sends the visitor to sign-in, and after signing in they return to the profile. **Not yet:** searching and opening venue pages (S3) and "booking asks them to sign in, then returns them" (S4), which reuse the same mechanism. |
| C-02 | S1 | Section 7; settings in 6.3; `POST /v1/auth/otp/request`, `POST /v1/auth/otp/verify`, `POST /v1/auth/refresh`, `POST /v1/auth/logout`; tables `otp_challenges`, `devices`, `refresh_tokens` | Code by WhatsApp with SMS fallback (with the fake provider in CI and a real vendor on staging), expiry after 5 minutes, lock for 15 minutes after five wrong tries, limits per phone and per device |
| C-03 | S1 | Sections 11.3 and 14; `language` in `PATCH /v1/me` and `POST /v1/auth/otp/request`; `customers.language` | Every S1 screen works in both languages, Arabic right to left, and the choice is remembered on the phone and in the profile |
| C-04 | S1 | Section 10; `GET`, `PATCH` and `DELETE /v1/me`; `customers` constraints | Name and optional email can be edited; deletion from inside the app removes personal data and ends every session |
| A-01 | S1 | Sections 8.3 and 9.1 to 9.2; `POST /v1/admin/auth/sign-in`, `POST /v1/admin/auth/totp/verify`, `GET /v1/admin/me`; table `admin_users` | No admin screen or admin endpoint works without both the password and the authenticator code |
| A-11 | S1 | Sections 5.3 and 9.3; `GET /v1/admin/activity-log`; table `admin_activity_log` with its grants and trigger | Sign-ins, sign-outs, locks and seed-command actions are recorded with who, what and when; a test shows that `UPDATE` and `DELETE` on the table fail |
