# FeenGo architecture

**Status: draft for owner approval.** Written 2026-11-18 by the architect for slices S0 (Foundation) and S1 (Sign-in). Approving this document approves everything in it, including the pinned versions and the exact dependency lists in sections 17 and 18, **except the open questions in section 22**, which the owner decides one by one. Where a design depends on an open question, the text says so and names the default that applies until the answer comes. Anything outside the dependency lists needs a new approval.

Read with `docs/STACK.md` (the stack and the rules), `docs/PRD.md` (requirement IDs), `docs/ROADMAP.md` (slices) and `docs/api/openapi.yaml` (the contract). `docs/DECISIONS.md` holds only decisions the owner has made. The architect's proposals are in section 24; each one moves to `docs/DECISIONS.md` once the owner approves it.

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
24. Proposed decisions, awaiting the owner

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
  package.json              root workspace: scripts and shared dev tools only (release-manager, C1)
  pnpm-workspace.yaml       apps/api, apps/partner-web, apps/admin-web, packages/*,
                            tests/contract, tests/e2e/web; engineStrict, saveExact,
                            the ESLint peer override, minimumReleaseAgeExclude      (release-manager, C1)
  pnpm-lock.yaml            one lockfile                                            (release-manager, C1)
  .npmrc                    engine-strict, save-exact, for npm and other tools      (release-manager, C1)
  .nvmrc                    26.13.1                                                 (release-manager, C1)
  tsconfig.base.json        strict TypeScript settings shared by all TS apps        (release-manager, C1)
  eslint.config.mjs         shared ESLint flat config                               (release-manager, C1)
  .prettierrc               formatting                                              (release-manager, C1)
  .prettierignore           skips docs/, CLAUDE.md, .claude/, the lockfile and
                            apps/mobile                                             (release-manager, C1)
  docker-compose.yml        local Postgres and Redis                                (release-manager, C1)
  docker/postgres/initdb/
    01-create-roles.sh      creates the two database roles (section 5.1)            (release-manager, C1)
  .env.example              every variable, no values that work anywhere real       (release-manager, C1)
  redocly.yaml              contract lint rules (section 21)                        (release-manager, C3)
  .github/workflows/        CI, every job                                           (release-manager)
  apps/
    api/                    NestJS                                                  (backend-dev)
    mobile/                 Flutter, not part of the pnpm workspace                 (mobile-dev)
    partner-web/            Next.js                                                 (web-dev)
    admin-web/              Next.js                                                 (web-dev)
  packages/
    design-tokens/          token source, generator, generated CSS, TS and Dart     (ui-ux-designer)
      flutter/              generated Dart package `feengo_design_tokens`
    web-ui/                 shared React components, created only when needed       (web-dev)
  tests/                                                                            (qa-tester)
    contract/               API contract tests, its own workspace package
    e2e/web/                Playwright journeys for both websites, its own workspace package
    e2e/mobile/             Maestro flows for the app
  docs/                     documents; docs/api is the contract                     (architect and others)
  store/                    store listing material                                  (release-manager)
```

**Workspace and package manager: pnpm workspaces, no Turborepo or Nx yet.** Three TypeScript apps and one or two packages do not need a build orchestrator. pnpm gives one lockfile, strict dependency isolation (an app can only import what it declares) and fast installs, and it is already in the development container. The root `package.json` pins the exact pnpm version in its `packageManager` field; any pnpm 10 or later switches to that version by itself, so the container's pnpm 10.28 works. If CI gets slow, Turborepo can be added later without moving any folder.

**Flutter sits outside the pnpm workspace.** It has its own package manager (pub). It reads the design tokens through a path dependency on `packages/design-tokens/flutter`.

**Shared web component library.** `packages/web-ui` is owned by web-dev and is created only when both websites need the same component, which is likely in S2 when the partner dashboard is built. Until then each website keeps its own components. Generated API types for the websites follow the same rule: inside `apps/admin-web` in S1, moved to a shared `packages/api-types` package once the partner dashboard also calls the API.

**Root tooling is owned by release-manager.** C1 creates every root file: `package.json` with the root dev dependencies (section 18.1), `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig.base.json`, `eslint.config.mjs`, `.prettierrc`, `.prettierignore`, `.npmrc`, `.nvmrc`, `docker-compose.yml`, the database init script `docker/postgres/initdb/01-create-roles.sh` and `.env.example`. Later changes to root files are release-manager's too. App owners change only their own folder, including their own `package.json`.

**Every CI job is written by release-manager.** For each increment, section 3 names whether the job arrives in the same pull request (release-manager adds it as a second owner, touching only `.github/`) or in a follow-up pull request.

**One lockfile change at a time.** Only one open pull request may touch `pnpm-lock.yaml` at a time. The strictly sequential increments in section 3 already give this; it also applies to dependency-update pull requests, which wait while a feature pull request changes the lockfile.

**qa-tester's files live in `tests/`**, so qa-tester never edits another owner's folder. `tests/contract` and `tests/e2e/web` are workspace packages with their own dependencies (section 18.6). Maestro flows in `tests/e2e/mobile` find widgets by keys that mobile-dev adds; the list of keys is agreed in writing in the screen spec before the flow is written. Unit, widget and golden tests stay in each app and belong to that app's owner.

**Rules for dependencies.** Exact versions (`save-exact`), one lockfile, `engine-strict` on Node. A dependency not listed in section 18 needs the owner's approval first (CLAUDE.md).

**Where the pnpm settings live (learned in C1).**

- **pnpm 12 reads `engineStrict` and `saveExact` only from `pnpm-workspace.yaml`** and ignores them in `.npmrc`. So C1 sets them in `pnpm-workspace.yaml`. `.npmrc` keeps `engine-strict` and `save-exact` for npm and other tools that read it.
- **Node versions.** The root `package.json` has the range `"engines": { "node": ">=26.13.1 <27" }`, so a later Node 26 patch release does not block installs. `.nvmrc` stays on the exact version, 26.13.1, and the Docker images pin the exact version (section 17).
- **`minimumReleaseAgeExclude` is temporary.** pnpm 12 holds back versions published less than a day ago. @redocly/cli 2.80.0 was published on the day C1 was built, so `pnpm-workspace.yaml` excludes exactly `@redocly/cli@2.80.0` from that rule. release-manager removes the entry in the next pull request that touches root files after 2026-11-19 13:11 UTC. That pull request must not add other exceptions.
- **`.prettierignore`** keeps Prettier off documents (`docs/`, `CLAUDE.md`, `.claude/`), off the generated `pnpm-lock.yaml`, and off `apps/mobile`, which `dart format` formats. Prettier also skips everything in `.gitignore`.

## 3. S0 increments C1 to C11

Each increment is one pull request that builds, tests and can be merged alone. **The increments are built strictly in this order: each one is merged before the next one starts** (ROADMAP.md). Only design specs and documents for the next slice may be prepared alongside.

| Inc. | Pull request | Owner | CI job, written by release-manager | What proves it |
| --- | --- | --- | --- | --- |
| C1 | Root workspace files (section 2) and local services: `docker-compose.yml` with Postgres 18.7 and Redis 8.10.3, an init script that creates the two database roles (section 5), `.env.example` | release-manager | None yet; C3 starts the pipeline | `pnpm install` works on a clean checkout; `docker compose up -d` gives healthy Postgres and Redis |
| C2 | API health: NestJS app, config validation, structured logging with redaction, database and Redis clients, `GET /health`, `GET /health/ready` | backend-dev | Follow-up pull request: C3 | API tests for both endpoints, including 503 when Redis is stopped; the log-redaction test (section 4.5) |
| C3 | CI for the API: workflow skeleton, install, lint, type check, unit and API tests with Postgres and Redis service containers, Docker build, contract lint with `redocly.yaml`, dependency scan | release-manager | This is the job | Pipeline green on a push |
| C4 | Migration tool and settings tables: Kysely migrator, first migration creating `setting_definitions` and `settings`, migrate up, down, up in CI, type generation | backend-dev | Same pull request: migration and generated-types steps added to the api job | Migrations run forward and back on an empty database |
| C5 | Design tokens package: DTCG token files with the provisional tokens, temporary dark-theme values that pass contrast (section 13), Style Dictionary build to CSS, TypeScript and Dart, contrast check, committed outputs | ui-ux-designer | Same pull request: design-tokens job | Build is reproducible; contrast check passes; CI fails if outputs are stale |
| C6 | Flutter app shell: flavors, light and dark themes from tokens following the phone's setting, English and Arabic with right to left, a language switch that is remembered, placeholder home screen | mobile-dev | Same pull request: mobile job, which uploads the Android debug APK as a build artifact | Widget and golden tests in both languages and themes |
| C7 | Analytics test event: Firebase projects wired per flavor, one test event | mobile-dev | No new job; the mobile job runs its tests | A unit test with a mocked analytics service proves the event is sent once with its parameters; the event is seen in Firebase DebugView from both phones |
| C8 | Partner-web shell: Next.js app, tokens, English and Arabic with `lang` and `dir`, placeholder page | web-dev | Same pull request: partner-web job | Unit test and Playwright screenshot in both languages; ESLint runs cleanly with the pinned versions |
| C9 | Admin-web shell: the same for the back office | web-dev | Same pull request: admin-web job | As C8 |
| C10 | iOS build in CI: unsigned `flutter build ios` on macOS | release-manager | This is the job. Its trigger waits for the owner's answer to question 16 (section 22) | Job green |
| C11 | Test suites: Maestro smoke flow, Playwright smoke for both websites, API contract tests, all in `tests/` | qa-tester | Same pull request: end-to-end and contract jobs | Full run green; S0 done-check in ROADMAP.md |

Nothing in an earlier increment depends on a later one.

### 3.1 How S0 is checked on real phones

ROADMAP.md's done-check needs the empty app running on a real iPhone and a real Android phone in both languages. In S0 this is done without any store:

- **iPhone:** installed from Xcode on the owner's Mac, signed with the owner's Apple team (`flutter run --flavor dev` with the phone connected). A free personal team works but its builds stop opening after 7 days; the paid Apple Developer Program account needed later for TestFlight works without that limit.
- **Android:** the mobile CI job uploads the debug APK of the `dev` flavor as a build artifact; the owner downloads it and installs it on the phone.
- **TestFlight and Google Play internal testing are not part of S0.** They start with the first tester release in S1 (ROADMAP.md, "When a slice is done", step 5).

## 4. Backend: modules, request pipeline and API conventions

### 4.1 Framework

NestJS 12 on Express 5 (the NestJS default), as ES modules, TypeScript 6.0 in strict mode. NestJS 12's own project template uses ES modules and Vitest, and this design follows that template rather than fighting it (section 17). The owner chose Vitest instead of Jest on 2026-11-18 (question 4 in section 22, DECISIONS.md); STACK.md now names Vitest.

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

`customers` is one more module than the list in STACK.md (question 17 in section 22). It keeps profile data apart from sign-in mechanics, so the auth module never touches personal fields directly.

**Transactions across modules.** When one action changes tables of several modules (account deletion, section 10), the module that owns the action opens a Kysely transaction and passes the transaction handle to the other modules' public service methods, which accept an optional `trx` argument. No module reaches into another's tables, and the action still commits or fails as one.

### 4.3 Request pipeline

In order, for every request:

1. **Helmet** security headers. No CORS: the app is not a browser, and the websites call the API from their servers, so the API refuses cross-origin browser calls by default.
2. **Request ID** from `X-Request-Id` (if a valid UUID) or a new one, returned on the response and attached to every log line.
3. **Structured logging** with pino, by the rules in section 4.5.
4. **Body size limit** of 64 KB (file uploads in S2 go straight to object storage, not through JSON bodies).
5. **Rate limit guard** (Redis, section 7.4), using the client IP described in section 4.6.
6. **Authentication guard.** Every route needs a valid access token unless it is marked `@Public()`. Secure by default.
7. **Role guard.** Each route declares its roles, matching `x-roles` in the contract. Admin routes also require `amr` to contain `otp`.
8. **Ownership.** Services take the caller's ID from the token, never from the request body. `/v1/me` has no ID in the path, so there is nothing to tamper with.
9. **Validation.** A zod schema per request body and query, written to match the contract, with strict objects that reject unknown body fields and unknown query parameters (`400 VALIDATION_FAILED`, field code `UNKNOWN_FIELD`). API tests check every response against `openapi.yaml`.
10. **Exception filter** turns every error into the `Problem` shape.

### 4.4 API conventions (all in `openapi.yaml`)

- **Versioning.** `/v1/...` for business endpoints. A breaking change gets `/v2` for the affected endpoints only. Health endpoints stay unversioned.
- **One error shape**: RFC 9457 problem details with a stable `code`. Clients translate `code` from their own files, so no user-facing text comes from the server (bilingual rule).
- **Pagination**: opaque `cursor` plus `limit`, response `{ items, nextCursor }`.
- **Times**: stored and sent in UTC (`timestamptz`), shown in Cairo time by clients.
- **Money** (from S4): integer minor units (piastres) plus an ISO 4217 currency code. Never floating point.
- **Bilingual text** (from S2): sent as `{ "en": "...", "ar": "..." }` objects so clients switch language without fetching again.
- **Idempotency** (from S4): booking and payment `POST`s require an `Idempotency-Key` header (UUID). The API stores the key with a hash of the request and the response for 24 hours, scoped to the caller. The same key with the same body returns the stored response; with a different body, `409 IDEMPOTENCY_KEY_REUSED`. Table `idempotency_keys` is created in S4.
- **Unexpected errors** use the same shape: every operation has a `default` response of `INTERNAL_ERROR` (500) or `SERVICE_UNAVAILABLE` (503). The one exception is `GET /health/ready`, whose 503 returns the `Readiness` body so probes can see which dependency is down.

### 4.5 Logging and redaction

- **Bodies are never logged**, neither requests nor responses. A request log line holds the method, the route pattern (not the raw URL), the status, the duration, the request ID and the caller's subject ID.
- **Redaction** applies to anything else that reaches a log, with pino's redaction paths, including one-level wildcards: `req.headers.authorization`, `req.headers.cookie`, `req.headers["x-feengo-forwarding-key"]`, `res.headers["set-cookie"]`, `*.password`, `*.code`, `*.accessToken`, `*.refreshToken`, `*.tokens`, `*.mfaToken`, `*.otpauth`, `*.secret`, `*.name`, `*.email`, `*.phone`, `*.to`, `*.phone_e164` and the top-level keys of the same names, such as `phone_e164`. Where a phone must be identified for support, the log carries only its last 3 digits.
- **Errors are logged under names the wildcards do not touch.** `*.code` and `*.name` would otherwise blank `err.code`, `err.name` and problem codes. The error serializer writes `err: { errorType, errorCode, message, stack }`: `errorType` from the error's class name, `errorCode` from the error's or the Problem's code. It drops database error fields that can hold row values (`detail`, `where`, `parameters`). Request log lines carry a failed request's Problem code as `errorCode` too. A test, `Q-05 error codes survive redaction`, checks that `errorCode` and `errorType` appear while a planted `name` and `code` do not.
- **Outbound calls to providers are never logged** (WhatsApp, SMS, and later Paymob and Firebase). Their HTTP clients have request and response logging switched off; the code logs only the provider name, the outcome, the provider's message ID and the duration.
- **The websites follow the same rules.** Their server code logs through one small wrapper that accepts only named, allowed fields; it never logs bodies, cookies or tokens.
- **Test, written in C2 and extended in S1:** `Q-05 logs never contain a known code, token or phone number`. It captures every log line during a request-code, verify, refresh and profile run with a fixed fake code, and fails if the code, either token or the phone number appears. S1 adds the same test for the admin website's sign-in route handlers.

### 4.6 Client IP and the website servers

- Behind the host's load balancer, the API takes the client IP from `X-Forwarded-For`, trusting only the number of proxy hops set in `TRUST_PROXY`.
- Calls from the website servers would otherwise all come from one IP. Each website server therefore sends the browser's IP in `X-FeenGo-Client-IP` together with `X-FeenGo-Forwarding-Key`, a secret shared only with the API (`BFF_FORWARDING_KEYS`, one key per website). The API uses `X-FeenGo-Client-IP` only when the key matches (compared in constant time) and ignores it otherwise. Both headers are declared in the contract. The website server takes the browser's IP only from its own host proxy's trusted hops, and strips any client-supplied copies of these headers (section 8.3).
- **Per-IP limits are high ceilings against abuse, not everyday limits.** Many Egyptian mobile customers share one carrier IP address, so the everyday limits are per phone, per device, per email or per session (sections 7 and 8), and the per-IP numbers in the contract are set well above what a busy carrier address sends.
- Health probes are not limited per IP in practice: their ceilings in the contract are far above what probes send, and readiness results are cached for 1 second so a flood never reaches the database.

### 4.7 Tracked follow-ups from C2

These are notes raised in the C2 review, not decisions. Each one is settled at the point named.

- **Before the first S1 `POST`: 413 and 415.** Declare `413` (payload too large) and `415` (unsupported media type) responses in the contract, and decide whether 413 keeps `VALIDATION_FAILED` or gets its own code. That is a contract change. Until then, C2 returns 413 with `VALIDATION_FAILED` under the `default` response.
- **Before S1's first query that uses request data: error messages that contain input values.** Section 4.5 needs a rule for errors whose message repeats an input value, such as PostgreSQL's "invalid input syntax …: <value>" and V8's JSON `SyntaxError`. For example, for `DatabaseError`, keep the SQLSTATE, table, column and constraint, and replace the message with fixed text.
- **By C3 or S1: health-probe log volume.** Log health 2xx at `debug` and readiness 503 at `warn`.
- **Before the first table (C4 or S1): narrowed Kysely typing per module.** Section 4.2 gives each module a `Kysely<Pick<Database, ...>>` with only its own tables. **Done in C4:** core exports `ModuleDatabase<Tables>` and `moduleDatabaseProvider`, and no longer exports the full database from its public `index.ts`. The narrowing covers the query builder only: raw `sql` can still reach any table, and a module could ask `moduleDatabaseProvider` for another module's tables, so reviews must watch both. A test maps each module's provider to the tables section 4.2 gives it.
- **Before `SettingsService` (S1): settings table details that section 6.1 leaves open.** Raised in C4, not decided:
  - should `feengo_app` keep INSERT, UPDATE and DELETE on `setting_definitions`, given that rows are added only by migrations? Today it has all four, like every table.
  - should `setting_definitions.unit` get a CHECK on the listed units?
  - who updates `settings.updated_at` on change: `SettingsService` or a trigger?
  - should `settings.version` get a `CHECK (version >= 1)`?
- **For the Dockerfile in C3.** `.dockerignore` must exclude `.env`. The image must keep `package.json` next to `dist/`, because the API reads its version from it. Done in C3: `.dockerignore` excludes `**/.env`, `**/.env.*` (except `**/.env.example`), `**/*.pem`, `**/*.key`, keystores, `.p12` and `.mobileprovision` files and the Firebase config files at any depth, and `apps/api/Dockerfile` copies `package.json` next to `dist/`.
- **Before S1: Errors nested below the top level of a log object.** `formatters.log` sends a top-level `Error` through the serializer, but one nested deeper (for example `{ ctx: { error } }`) is written with its own fields, so a database error's `detail`, `where` and `parameters` would reach the log. Either serialize Errors one level down as well, or require every error to be logged under `err`, with a lint rule or test that enforces it.
- **With S1's first request body: field-error codes.** C2's validation pipe reports unknown fields as `UNKNOWN_FIELD` and any other mismatch as `NOT_ALLOWED_VALUE`, which only unknown query parameters can reach today. Before the first body schema, map zod issues to specific codes so clients show the right message: a missing field to `REQUIRED`, `too_big` to `TOO_LONG`, `too_small` to `TOO_SHORT`, `invalid_format` to the matching `FORMAT_*` code.

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
- Migrations run from source with Node's built-in type stripping, so a migration file imports **packages only** (kysely, pg, Node built-ins), never another source file, and uses **only erasable TypeScript syntax** (no `enum`, `namespace` or parameter properties). A lint rule rejects relative imports there.
- Kysely's own history tables (`kysely_migration`, `kysely_migration_lock`) live in the schema `feengo_migrations`, owned by the migrator. The app role has no access to it, so it can never rewrite migration history.
- CI runs up, then down to zero, then up again on an empty database, then regenerates types and fails if `schema.generated.ts` changed.
- Expand then contract: a column is added and filled in one release, and old columns are removed in a later one, so a deploy never breaks running containers.
- In deployed environments, migrations run as a one-off release step before new containers start, using the migrator role.
- **Down migrations are blocked outside development.** The migration command refuses `down` unless `APP_ENV` is `local` or `test`, and the deploy pipeline only ever runs `latest`. A production rollback is a new forward migration.

**Database roles**, created once per environment:

- `feengo_migrator` owns the database and the `public` schema, and runs migrations. On PostgreSQL 15 and later the database owner also owns `public` (`pg_database_owner`), so only the migrator can create objects there.
- `feengo_app` is what the API connects as. It gets **only `CONNECT` on the database** and `USAGE` on `public`, plus **default privileges**: `SELECT, INSERT, UPDATE, DELETE` on every table and `USAGE, SELECT` on every sequence that the migrator creates (`ALTER DEFAULT PRIVILEGES FOR ROLE feengo_migrator IN SCHEMA public ...`). No DDL, no temporary tables, and `PUBLIC` loses its rights on the database and its `CREATE` on `public`. Locally, C1's `docker/postgres/initdb/01-create-roles.sh` does this.
- **Tables that need less revoke the rest in their own migration.** Because of the default privileges, every new table starts with full DML for the app role. So the S1 migration that creates `admin_activity_log` must explicitly run `REVOKE UPDATE, DELETE, TRUNCATE ON admin_activity_log FROM feengo_app` (section 5.3), and its `down` drops the table. A named S1 test proves the result: **`A-11 the app role cannot update, delete or truncate activity-log rows`**. It asserts with `has_table_privilege('feengo_app', 'admin_activity_log', ...)` that `SELECT` and `INSERT` are true and `UPDATE`, `DELETE` and `TRUNCATE` are false. The trigger tests are separate and must run as a role that still holds those privileges, such as `feengo_migrator`. Run as the app role, they would fail on the missing grants before the trigger fires, and so prove nothing about the trigger.
- **Staging and production** create the roles by the same steps on the host, written down by release-manager and run once with the host's admin user. They also revoke CONNECT from PUBLIC on every database other than the app's (`postgres`, `template1` or the host's equivalents), for example `REVOKE CONNECT ON DATABASE postgres FROM PUBLIC`, so the app and migrator roles can connect only to the app's database. The local Compose stack does not do this, which is acceptable for a throwaway local database.

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
| `last_signed_in_at` | timestamptz, null | |
| `created_at`, `updated_at` | timestamptz | not null |

No API creates admins. Rows are created only by the seed command (section 9). The sign-in lock is not kept here; it lives only in `admin_sign_in_attempts`.

#### `admin_sign_in_attempts` (module: admin)

The one place where admin sign-in failures and locks are kept, for known and unknown email addresses alike.

| Column | Type | Rules |
| --- | --- | --- |
| `email_hmac` | bytea | primary key; HMAC-SHA-256 of the lower-case email with `PHONE_HASH_PEPPER`, so unknown addresses are not stored in plain text |
| `failed_attempts` | smallint | not null, `CHECK (failed_attempts >= 0)` |
| `window_started_at` | timestamptz | not null |
| `locked_until` | timestamptz, null | |
| `updated_at` | timestamptz | not null |

- Updated atomically in one statement: `INSERT ... ON CONFLICT (email_hmac) DO UPDATE SET failed_attempts = CASE WHEN window_started_at < now() - lock window THEN 1 ELSE failed_attempts + 1 END, ... RETURNING failed_attempts, locked_until`. Two wrong passwords at the same moment both count.
- A successful sign-in deletes the row. Rows whose window and lock have passed are removed by the daily purge.

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
| `provider_message_id` | text, null | the provider's ID, for support and, once a vendor is chosen, delivery receipts |
| `delivery_status` | text | not null, `CHECK (delivery_status IN ('queued','sent','delivered','failed'))`; `failed` when both channels refused |
| `language` | text | not null, `CHECK (language IN ('en','ar'))` |
| `attempt_count` | smallint | not null, default 0, `CHECK (attempt_count >= 0)`; comparisons reserved before each check, a per-challenge cap that still holds if Redis loses data (section 7.5) |
| `expires_at` | timestamptz | not null; `created_at` plus the `auth.otp.code_ttl_seconds` setting at creation |
| `consumed_at` | timestamptz, null | set on success, or when a newer code replaces it, or on lock |
| `created_at` | timestamptz | not null |

- Index `(phone_e164, created_at DESC)` to find and end the previous challenge.
- Unique partial index on `(provider, provider_message_id) WHERE provider_message_id IS NOT NULL`.
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
- Purge, by the same daily command: a **used** token is kept only for the reuse-detection window (`REFRESH_REUSE_DETECTION_DAYS`, default 7) and then deleted; replaying a token older than that gets `REFRESH_TOKEN_INVALID` without ending the session. Expired and revoked tokens are deleted after 30 days.

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
- Append-only, enforced by the database and not only by code: `feengo_app` has only `SELECT, INSERT` (the migration revokes `UPDATE` and `DELETE`, which the default privileges in section 5.1 would otherwise grant, and `TRUNCATE` as a safeguard), and a `BEFORE UPDATE OR DELETE OR TRUNCATE ... FOR EACH STATEMENT` trigger raises an error (statement level, because `TRUNCATE` triggers can only be statement level). This stops the API, any bug in it and any mistake by an operator using the app role.
- **What it does not stop:** the table owner (`feengo_migrator`) or a database superuser can drop or disable the trigger. That is why the migrator credentials are kept separately from the app's, down migrations are refused outside development (section 5.1), and the deploy pipeline runs only forward migrations. Making tampering by those roles detectable needs a hash chain or an off-site copy of the log, a possible later step (section 9.3).
- Written in the same transaction as the action it records, so an action cannot happen without its entry.
- Kept indefinitely until a lawyer sets a retention period.

### 5.4 Room for later slices

Not created now. Listed so that S0 and S1 choices do not block them. **Everything in this table is provisional:** each slice's architecture update confirms or changes it, with the owner's approval.

| Table (slice) | Provisional key points |
| --- | --- |
| `venues` (S2) | `latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90)`, `longitude ... BETWEEN -180 AND 180`, `city_code`, `country_code` (ISO 3166-1, `'EG'`), `currency_code` (ISO 4217, `'EGP'`), `time_zone` (`'Africa/Cairo'`), `name_en` and `name_ar` both not null, `status` (pending, approved, rejected, suspended). Venue-scope rows in `settings` get their foreign key to `venues` in this migration. |
| `partner_users`, `venue_members` (S2) | owners and staff; `refresh_tokens.partner_user_id` added |
| `plans`, `venue_subscriptions` (S2) | the billing structure that stays switched off (DECISIONS 2026-11-16). Every venue gets the free plan; setting `billing.enabled = false`. |
| `agreement_versions`, `agreement_acceptances` (S2) | accepted version and time (P-01, A-09) |
| `categories`, `occasions`, `cuisines`, `areas` (S2) | admin lists in both languages (A-05) |
| `setting_changes` (S4) | the R-04 log: who, key, scope, old value, new value, when; append-only like the activity log |
| `booking_categories` (S4) | the admin-editable list of booking categories (normal table, birthday, engagement, wedding), names in both languages; gives `settings.booking_category_id` its foreign key |
| `bookings` (S4) | `policy_snapshot jsonb NOT NULL` (R-03), city, country and currency copied from the venue, status with a `CHECK`, `idempotency_keys` table, slot locking with a Redis hold plus a row lock on the slot inside the booking transaction (C-10) |
| `event_requests`, `quotes` (S5) | the request-for-quote flow |
| `payments`, `refunds`, `payment_events` (S6) | Paymob references only, never card data; each webhook verified and stored before it is trusted |

**"Venues near me" (C-05, S3) without PostGIS.** Plain formula, no extension:

1. The API turns the customer's position and radius into a bounding box (latitude plus or minus radius divided by 111.32 km; longitude adjusted by the cosine of the latitude).
2. `WHERE status = 'approved' AND latitude BETWEEN $1 AND $2 AND longitude BETWEEN $3 AND $4`, served by a B-tree index `(latitude, longitude) WHERE status = 'approved'`.
3. `ORDER BY` the haversine distance from a small `IMMUTABLE` SQL function created by migration, then `LIMIT`.

Why this rather than the bundled `cube` and `earthdistance` extensions: at launch there are hundreds to a few thousand venues, so the box leaves at most a few hundred rows to sort, which takes milliseconds and meets Q-01 (1 second on the server) by a wide margin. It needs no extension, so every managed PostgreSQL supports it. It also avoids `earthdistance`'s known trouble with expression indexes during dump and restore. S3 adds a test that seeds 10,000 venues and checks the query plan and time. If venues grow past about 50,000, a migration adds an `earthdistance` GiST index or PostGIS from the same two columns (owner decision of 2026-11-18, "PostgreSQL without PostGIS").

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
| `per_booking_category` | boolean | not null, default false; true means the setting has one value per booking category, such as the booking window or the deposit |
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
| `booking_category_id` | uuid, null | the booking category the row is for; null for settings that are not per category. Foreign key to `booking_categories` added in S4 |
| `value` | jsonb | not null, the JSON value (number, boolean, string, array or object) |
| `min_value`, `max_value` | jsonb, null | admin limits; platform rows only |
| `allowed_values` | jsonb, null | for `enum` settings; platform rows only |
| `version` | integer | not null, default 1, increases by 1 on every change |
| `updated_by_type` | text | not null, `CHECK (updated_by_type IN ('system','admin','partner_user'))` |
| `updated_by_id` | uuid, null | |
| `created_at`, `updated_at` | timestamptz | not null |

- `CHECK (scope = 'platform' OR (min_value IS NULL AND max_value IS NULL AND allowed_values IS NULL))`: only admins set limits.
- Unique partial indexes, with `NULLS NOT DISTINCT` (PostgreSQL 15 or later) so that a null category counts as one value: `(key, booking_category_id) WHERE scope = 'platform'` and `(key, venue_id, booking_category_id) WHERE scope = 'venue'`.
- Index `(venue_id) WHERE scope = 'venue'`.
- `SettingsService` refuses a row with a category for a definition that is not per category, and a row without one for a definition that is. A check constraint cannot look at the definition table, so a test covers this rule: `R-01 a per-category setting cannot be saved without its category`.

### 6.2 Reading, limits and caching

- `SettingsService.get(key)` returns the platform value. `get(key, { venueId, bookingCategoryId })` returns the venue's value for that category if one exists, otherwise the platform value for that category. There is no fallback from a category to "no category": a per-category setting always has a platform row for every category.
- **Limits (R-02), per category.** Each category has its own platform row, with its own default and its own `min_value`, `max_value` and `allowed_values`; for example the engagement deposit can have different limits from the birthday deposit. A venue's value for a category is checked against the platform row for the same category, in the same transaction as the write. When an admin adds a category (S4), the console creates its platform rows for every per-category setting before the category can be used. When an admin narrows a limit, venue values that fall outside it are reported to the admin before saving; the console decides what to do with them (designed in S4).
- **Cache.** Every API container keeps all platform settings in memory, loaded at start. A write publishes `settings:changed` on Redis, and every container reloads at once. As a safety net, containers also reload every 60 seconds. Venue values are cached in Redis under `settings:venue:{venueId}`, cleared on write. A change in the back office therefore reaches the app within seconds, with no release (R-01's acceptance check).
- **Versioning.** Each row has a `version`. The settings console (S4) sends the version it read, and a write with an older version gets `409 VERSION_CONFLICT`, so two admins never overwrite each other silently. The full history (R-04) is the `setting_changes` table in S4. Bookings copy the rules they were made under (R-03), so a later change never alters them.
- **Changes before S4.** There is no console until S4. S1 values change through a server command (`settings:set <key> <value> --operator <name>`) that validates limits and writes a `setting.changed` activity log entry with `actor_type = 'system'` and the old and new values (section 9.3).

### 6.3 Settings seeded in S1 (proposal)

**This is a proposal awaiting the owner (question 18 in section 22).** The PRD fixes the code expiry, the number of tries and the lock time in C-02 but does not list them among the changeable rules. The proposal makes them admin settings with the ranges below, so they can be tuned without a release. Either way the defaults are exactly the PRD's values. If the owner refuses, these keys become configuration values with the same defaults, and the code reading them does not change.

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
2. The API checks the phone format and country, the lock, the cooldown and the rate limits. It makes a 6-digit code with a secure random generator, stores a new challenge with the code's HMAC, and asks `OtpSender` to send it. Only after a channel accepts the message are the phone's earlier open challenges ended, so a failed send never takes away a code the customer already has.
3. `OtpSender` tries WhatsApp first. **In S1 the fallback is synchronous only:** if WhatsApp refuses the message during the request, `OtpSender` sends the same code by SMS within the same request. The code is still in memory at that moment; it is never kept after the request ends. The response says which channel was used.
4. If WhatsApp accepted the message but the customer never receives it, the app offers "send by SMS instead" once the resend cooldown has passed. That is a new request with `channel: sms`, which makes a **new** code, replaces the stored hash and ends the earlier challenge.
5. The app sends `POST /v1/auth/otp/verify` with the code and its device details. On success: customer created if new, device upserted, session started, tokens returned. On a wrong code: the counter goes up, and at the limit the phone is locked and the challenge ends (section 7.5).

**Late fallback, deferred until the vendor is chosen.** A WhatsApp message that is accepted and then fails later is reported only through the vendor's delivery-receipt webhook. Because only the HMAC of the code is stored, the server cannot resend the same code; on a late failure it would issue a **new** code by SMS and replace the hash on the challenge. That needs a webhook endpoint whose signature scheme depends on the vendor, so it is not in the S1 contract. Once the owner chooses a vendor, the architect adds `POST /v1/webhooks/otp-delivery/{provider}` to the contract: no bearer token, the vendor's signature required and checked before anything else, unknown fields rejected, idempotent on the provider's message ID.

### 7.2 Rules

- **Expiry, tries and lock** come from the settings in section 6.3 (or from configuration with the same defaults, if the owner refuses question 18). The lock is per phone number and covers all of its challenges, so asking for a new code does not reset the count.
- **Rate limits per phone and per device** (security baseline) come from settings. Because an installation ID is easy to change, there is also a per-IP ceiling from configuration, set high enough for carrier addresses shared by many customers (section 4.6).
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

A small `RateLimiter` service in core uses Redis fixed windows: `INCR`, and `EXPIRE` on the first increment, in one Lua script so the two steps cannot be split. Keys look like `rl:otp:phone:{hmac(phone)}`; phone numbers and emails in Redis keys are always HMACs (with `PHONE_HASH_PEPPER`), never plain. Limits are read from settings at call time. Redis runs with append-only persistence (written every second).

### 7.5 Counters, locks and races

Every counter and every "only once" rule is a single atomic operation. Where each one lives:

| Rule | Where | Atomic operation |
| --- | --- | --- |
| Wrong codes per phone (C-02's five tries) | Redis `otp:fail:{hmac(phone)}`, window = `auth.otp.lock_minutes` from the first wrong code | One Lua script, run **before** the code is compared: if `otp:lock:{hmac}` exists, return locked; otherwise `INCR` the counter (setting its expiry on the first increment); if the result is above `auth.otp.max_wrong_attempts`, set the lock and return locked. Only then is the code compared. A correct code deletes the counter. Because the attempt is counted before comparing, parallel guesses can never get more than the allowed number of comparisons. |
| The lock | Redis `otp:lock:{hmac(phone)}` with expiry `auth.otp.lock_minutes` | Set when a wrong code is the one that reached the limit (that request answers `423 OTP_LOCKED`), and by the script itself for any parallel attempt counted beyond the limit |
| Attempts per challenge | Postgres `otp_challenges.attempt_count` | Reserved **before** the code is compared, right after the Redis script: `UPDATE otp_challenges SET attempt_count = attempt_count + 1 WHERE id = $1 AND attempt_count < $max AND consumed_at IS NULL RETURNING attempt_count`. No row returned: the API reads the row once and answers by its state, never locking a used or expired challenge (see "When the reservation returns no row" below the table). On a correct code the reservation is simply left in place, because the challenge is consumed anyway. A second cap that does not depend on Redis, and that parallel guesses cannot exceed. |
| A code works once | Postgres `otp_challenges.consumed_at` | `UPDATE otp_challenges SET consumed_at = now() WHERE id = $1 AND consumed_at IS NULL AND expires_at > now() RETURNING id`, run only after the code matched. No row returned: the API reads the row once more to answer `409 OTP_ALREADY_USED` or `410 OTP_EXPIRED`. |
| One code at a time per phone | Redis `otp:cooldown:{hmac(phone)}` | `SET ... NX EX <auth.otp.resend_cooldown_seconds>`. Only one of two parallel requests gets through; the other gets `429 OTP_RESEND_TOO_SOON`. After a channel accepts the message, one statement ends the earlier open challenges: `UPDATE ... SET consumed_at = now() WHERE phone_e164 = $1 AND consumed_at IS NULL AND id <> $new`. |
| Requests per phone and per device | Redis `rl:otp:phone:...`, `rl:otp:device:...`, one hour | The rate limiter's script (section 7.4) |
| Nothing counts when both channels fail | Redis cooldown and counters, Postgres challenge | When WhatsApp and SMS both refuse (`503 OTP_DELIVERY_FAILED`), the API marks the new challenge `failed` and consumed, deletes `otp:cooldown:{hmac}`, and takes back this request's increments of the per-phone, per-device and per-IP counters with one Lua script (decrement only if the key still exists and is above zero). The contract promises that nothing counts against the customer, and the earlier challenge is still open. |
| One customer per phone | Postgres `customers` partial unique index | `INSERT INTO customers (phone_e164, language) VALUES ($1, $2) ON CONFLICT (phone_e164) WHERE phone_e164 IS NOT NULL DO UPDATE SET last_signed_in_at = now() RETURNING id, (xmax = 0) AS inserted`. Two first sign-ins at the same moment give one customer; `inserted` says whether it is new. |
| One device row per installation | Postgres `devices` unique `(customer_id, installation_id)` | `INSERT ... ON CONFLICT (customer_id, installation_id) DO UPDATE SET last_seen_at = now(), app_version = EXCLUDED.app_version` |
| Admin sign-in failures | Postgres `admin_sign_in_attempts` | Single-statement upsert (section 5.3) |

**When the reservation returns no row**, the API reads the challenge once and answers by its state, in this order:

- `consumed_at` is set (used, replaced by a newer code, or ended): `409 OTP_ALREADY_USED`, **no lock**.
- `expires_at` has passed: `410 OTP_EXPIRED`, no lock.
- Only when `attempt_count >= max`: the API ends the challenge, sets the Redis lock again and answers `423 OTP_LOCKED`.

In the 409 and 410 cases nothing was compared, so the API also takes back this request's Redis per-phone increment (decrement only if the key still exists and is above zero). A retried request can therefore never lock the phone.

**If Redis loses data** (a restart that loses the last second of writes, a failover, or a flush):

- Code expiry and single use still hold, because they are in Postgres.
- Each challenge still allows at most `auth.otp.max_wrong_attempts` comparisons, because the Postgres reservation is made before each comparison, even for parallel guesses. A guesser therefore gets at most five tries per one-in-a-million code.
- What is lost: the per-phone lock and counter across challenges, cooldowns and hourly limits. They start again from zero, and the per-challenge cap bounds the damage. Admin locks are not affected, because they are in Postgres.
- Also lost: the access-token deny-list (an ended session's access token works until it expires, at most 15 minutes; its refresh tokens are already revoked in Postgres), refresh successors cached for the grace period (section 8.1), and admin `mfaToken`s (the admin starts sign-in again).
- **If Redis cannot be reached at all**, the code request, code check, admin sign-in and refresh endpoints answer `503 SERVICE_UNAVAILABLE`. They never skip their limits.

**Tests for these races**, in the API test suite:

- `C-02 parallel wrong codes never get more than five comparisons per phone`
- `C-02 the fifth wrong code locks sign-in for the phone`
- `C-02 two parallel checks of the right code give exactly one session`
- `C-02 two parallel code requests for one phone send one code`
- `C-02 a new code ends the previous challenge`
- `C-02 two parallel first sign-ins for a new phone create one customer`
- `C-02 parallel guesses at one challenge after Redis is flushed get at most five comparisons` (20 guesses sent at once, after `FLUSHALL`)
- `C-02 a code request that both channels refuse leaves no cooldown and no count, and the earlier code still works`
- `C-02 a retried successful verify gets 409 and does not lock the phone` (the same correct verify sent six times after it succeeded, and a verify against a replaced challenge: each answers 409, the phone's count is unchanged, and a new code still works)
- `C-02 code request and check answer 503 when Redis is down`

## 8. Sessions and tokens

### 8.1 Tokens

- **Access token**: JWT signed with EdDSA (Ed25519) using `jose`. Lifetime 15 minutes (`ACCESS_TOKEN_TTL_SECONDS`). Claims: `sub`, `typ` (`customer` or `admin`), `sid`, `auth_time`, `amr`, `iss`, `aud` (`feengo-app` or `feengo-admin`), `iat`, `exp`. The header carries `kid`, so keys rotate without signing anyone out: the newest key signs, and all listed keys verify.
- **Refresh token**: 256 random bits, base64url, prefixed `frt_` so secret scanners can spot leaks. Only its SHA-256 hash is stored. Single use: every refresh returns a new one and marks the old one used (rotation). Replaying a used token after `REFRESH_REUSE_GRACE_SECONDS` (10) ends the whole session (theft detection).
- **Rotation, the grace period, and one branch only.** A session's tokens always form a single chain; a token never gets a second successor.
  1. Rotation is one statement inside a transaction: `UPDATE refresh_tokens SET used_at = now(), replaced_by_id = $new WHERE token_hash = $1 AND used_at IS NULL AND revoked_at IS NULL AND expires_at > now() RETURNING ...`. The row lock means that of two parallel refreshes with the same token, one rotates and the other waits.
  2. Before committing, the winner stores the successor in Redis under `rt:succ:{sha256(old token)}` for the grace period, encrypted with AES-256-GCM under a key derived (HKDF) from the **old token itself**, not from its stored hash. Only someone holding the old token can decrypt it; the database and Redis together are not enough. If the transaction then rolls back or the commit fails, the API deletes that cache entry before answering, so no cached successor exists without its database row. If even that delete fails, the entry expires within the grace period, and its token is unusable anyway because it has no database row.
  3. A request with an already used token, inside the grace period, gets the **same** successor from that cache, with a newly signed access token. No new refresh token is made.
  4. Inside the grace period but with the cache missing (Redis lost it), the API answers `401 REFRESH_TOKEN_INVALID` and makes nothing new. The session is not ended, but this client has to sign in again.
  5. After the grace period, a used token gets `401 REFRESH_TOKEN_REUSED` and the whole session is revoked.
- **Refresh is rate-limited per session** (30 an hour, `REFRESH_RATE_PER_SESSION_PER_HOUR`), with only a high per-IP ceiling, because admin traffic arrives through the website servers and many customers share carrier addresses.
- **Tests:** `C-02 a refresh retried within the grace period returns the same successor`, `C-02 two parallel refreshes with one token create one successor`, `C-02 a used refresh token replayed after the grace period ends the session`, `C-02 a refresh replayed within the grace period with the cache lost creates no second branch`, `C-02 a rotation that rolls back leaves no cached successor`, `C-02 refresh is limited per session`.
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

The browser only talks to its own Next.js server; only that server calls the API. All cookies below are `HttpOnly; Secure; SameSite=Strict; Path=/` with the `__Host-` prefix, which stops subdomains from setting or reading them. Next.js Server Components cannot set cookies, so every cookie is set either in a route handler or in `proxy.ts` (the Next.js request proxy, formerly middleware).

**Sign-in (admin, A-01)**

1. The sign-in form posts to the route handler `POST /session/password`. It calls `POST /v1/admin/auth/sign-in` and stores the returned `mfaToken` in a short-lived cookie, `__Host-feengo_mfa` (`Max-Age=300`). **No session cookie is set yet.**
2. The code form posts to `POST /session/totp`. It reads the `mfa` cookie, calls `POST /v1/admin/auth/totp/verify`, deletes the `mfa` cookie, and only then sets `__Host-feengo_at` (access token) and `__Host-feengo_rt` (refresh token).
3. Sign-out posts to `POST /session/sign-out`, which calls `POST /v1/auth/logout` and deletes both cookies.

**Refresh, one at a time per session**

- `proxy.ts` runs before any page renders. If the access token is missing or expires within 60 seconds and a refresh cookie is present, it calls `POST /v1/auth/refresh`, sets the new cookies on the response, and passes the new access token to the page render through a request header, so the page in that same request already uses it.
- Within one website server, refreshes are single-flight: parallel requests with the same refresh cookie share one call to the API. Across several website containers, two parallel refreshes are still safe, because the API returns the same successor within the grace period (section 8.1), so the session never splits.
- If refresh fails, `proxy.ts` deletes the session cookies and sends the browser to the sign-in page.

**Three layers check the session; the API is the final authority**

A check in a shared layout is **not** enough: when the user navigates inside the app, Next.js fetches only the changed page segment (a React Server Components request) and does not run the shared layouts again, so a layout check can be skipped. The design therefore checks in places that run on every request:

1. **`proxy.ts` verifies the access token on every request**, including React Server Components navigation requests (`RSC: 1`), prefetches and server action posts. Its matcher excludes only static files (`/_next/static`, `/_next/image`, fonts, `favicon.ico`). It verifies the JWT itself with `jose`: the signature against the API's public keys (`JWT_VERIFY_KEYS`, public keys only, never the signing keys), the expiry, `iss`, `aud = feengo-admin`, `typ = admin`, and `amr` containing `otp`. Any failure, after one refresh attempt, deletes the session cookies and redirects to the sign-in page (for an RSC request, the redirect response Next.js expects). Paths that do not need a session (`/sign-in`, `/session/password`, `/session/totp`) are the only exceptions, listed explicitly.
2. **`requireAdmin()`**, one shared server-only function in admin-web, is called at the top of **every** admin page, every server action and every route handler that serves signed-in users, not in a layout. It repeats the same JWT checks, so a page is safe even if the proxy were skipped (Next.js has had bugs that let requests bypass its middleware). On pages it also calls `GET /v1/admin/me`, which adds the API's own checks, including the deny-list of ended sessions, and returns the admin shown in the header. If either check fails it redirects to sign-in; in server actions and route handlers it answers 401.
3. **The API** checks every call itself: signature, expiry, deny-list, role and the second sign-in step. Pages get their data only through the API, so even a page that rendered by mistake would have no admin data to show.

If the owner refuses `GET /v1/admin/me` (question 15), nothing else changes: `requireAdmin()` relies on its local JWT check, the header shows no admin name (access tokens carry no name claim, by design, to keep personal data out of tokens), and a session ended less than 15 minutes ago can at most render an empty page frame, because every data call to the API is refused.

- Server actions and route handlers that change data send the access token to the API, which checks it again.
- CSRF: `SameSite=Strict`, plus a check of the `Origin` header on every state-changing route handler (Next.js server actions already check it).
- **Header hygiene.** `proxy.ts` deletes any incoming `X-FeenGo-Client-IP`, `X-FeenGo-Forwarding-Key` and `X-FeenGo-Internal-Access-Token` (the internal header that carries a freshly refreshed token to the page render) before setting its own values, so a browser can never supply them. The browser's IP is taken only from the hops of the website's own host proxy that are trusted (`TRUST_PROXY_HOPS`), never from a client-supplied `X-Forwarded-For` beyond them. Calls to the API are built in server code with headers set explicitly, never by copying incoming headers.
- **Tests:**
  - `A-01 a forged session cookie never renders an admin page`: a token signed with another key, an altered token, an expired token, a token with `aud = feengo-app`, a token without `otp` in `amr`, and random bytes, each in `__Host-feengo_at`. For each, a full page request, an **RSC navigation request** (`RSC: 1` with a router state header) to every admin route, a prefetch, and a server action post must give a redirect or 401 with no admin content.
  - `A-01 the password step alone never renders an admin page` (only the `mfa` cookie set), again for page and RSC requests.
  - `A-01 an ended session never renders an admin page`.
  - `A-01 every admin page, server action and route handler calls requireAdmin`: a static test that fails if one does not.
  - `A-01 client-supplied forwarding headers are ignored`.

The partner dashboard (S2) uses the same pattern with its own cookies and `aud`.

## 9. Admin sign-in (A-01) and the activity log (A-11)

### 9.1 Proposal: email, password and authenticator code

1. `POST /v1/admin/auth/sign-in` with email and password. Argon2id check. For an email with no account, the API still runs one Argon2id check against a fixed dummy hash, so the response time does not reveal whether the account exists. On success: an opaque `mfaToken`, kept in Redis for 5 minutes, single use, 3 tries.
2. `POST /v1/admin/auth/totp/verify` with the `mfaToken` and a 6-digit TOTP code (RFC 6238: SHA-1, 30-second steps, one step of clock drift allowed). A code is accepted once (`totp_last_used_step`). On success: tokens with `amr = ["pwd","otp"]`, and an `admin.signed_in` log entry.
3. Wrong passwords and wrong codes both count toward `auth.admin.max_wrong_attempts`, per email address, including unknown addresses, so a lock never reveals whether an account exists. The count and the lock are kept in one place only, the `admin_sign_in_attempts` table (section 5.3). At the limit, an `admin.locked` entry is logged for a known account.
4. **Known weakness:** anyone who knows an admin's email can lock that admin out for `auth.admin.lock_minutes` by sending wrong passwords. This is accepted because the lock is short, the per-IP ceiling slows it, and `admin:unlock` (section 9.2) ends it at once. The owner should know it is possible.

- Passwords: at least 12 characters, at most 200. Hashed with Argon2id using the library's current defaults.
- TOTP secrets: 20 random bytes, encrypted with AES-256-GCM using a key from `TOTP_ENCRYPTION_KEYS` (Node's built-in crypto). The key ID is stored so keys can rotate.
- Every admin endpoint requires a token with `typ = admin` and `otp` in `amr`.

### 9.2 Admin accounts come only from a seed command

There is no sign-up or invite endpoint. Server commands, run inside the API container (`node dist/cli.js ...`), each write an activity log entry with `actor_type = 'system'`. Every command requires `--operator "<name>"`, which is recorded in `details.operator` together with the operating-system user, so A-11's "who" is met for these entries too.

- `admin:create --email --name --operator`: asks for the password without showing it, makes the TOTP secret, and prints the `otpauth://` link and the secret once, for the owner to add to an authenticator app. They are never stored in plain text or logged.
  - The command **refuses to print the secret unless both its input and output are an interactive terminal**. Run with output redirected or piped, it stops with an error and creates nothing.
  - It warns before printing that some hosting consoles keep a copy of what they show, and asks for confirmation. Use a console session that is not recorded, or run the command from the owner's machine through a secure tunnel to the environment's database.
- `admin:reset-totp --email --operator`: for a lost phone. The same terminal rules apply. Ends all of that admin's sessions.
- `admin:unlock --email --operator`: removes a sign-in lock.
- `admin:disable --email --operator`: ends all sessions.

### 9.3 Activity log (A-11)

- `ActivityLog.record()` is the only writer, called in the same transaction as the action. S1 actions: `admin.created`, `admin.signed_in`, `admin.signed_out`, `admin.sign_in_failed` (known email only), `admin.locked`, `admin.unlocked`, `admin.totp_reset`, `admin.disabled`, and `setting.changed`.
- `setting.changed` records every settings change. In S1 it comes only from `settings:set`; from S4, from the settings console. Its target is `setting` with the key as ID, and `details` holds `key`, `scope`, `venueId`, `bookingCategoryId`, `oldValue`, `newValue`, `oldVersion` and `newVersion`. The R-04 change log in S4 is a separate table, written in the same transaction.
- Each later slice adds its own actions, such as `venue.approved` or `booking.refunded`.
- `GET /v1/admin/activity-log` reads it, newest first, with filters. Nothing in the API can change or delete an entry, and the database refuses such changes from the app role (section 5.3).
- Possible later strengthening: a hash chain (each row stores a hash of the previous one) or a regular off-site copy, so that even tampering by the table owner or a superuser would show. Not needed for S1.

## 10. Account deletion (C-04)

**Proposal, subject to the owner and a lawyer.**

`DELETE /v1/me`, from a screen in the app (Apple and Google both require deletion inside the app, Q-07):

1. The customer must have signed in within the `auth.account_deletion.reauth_window_minutes` setting (default 10). If not, the API returns `REAUTH_REQUIRED` and the app asks for a new phone code first. This stops someone holding an unlocked phone from deleting the account by accident or on purpose.
2. In one database transaction, opened by the customers module, which passes the transaction handle to the other modules' public services (section 4.2):
   - customers: `phone_e164`, `name` and `email` set to null, `status = 'deleted'`, `deleted_at = now()`;
   - auth: every refresh token of the customer **revoked** with reason `account_deleted` (kept so that a replay gets a clean `REFRESH_TOKEN_INVALID`, then removed by the normal 30-day purge); devices and their push tokens deleted; OTP challenges for that phone deleted.
3. After the commit, every session ID of the customer is added to the Redis deny-list, so access tokens stop working at once. If that write fails, it is retried three times and then logged as an error for the team. The gap is bounded: the refresh tokens are already revoked in Postgres, every `/v1/me` call reads the customer row and refuses a deleted customer with `401`, and any remaining access token expires within 15 minutes.
4. From later slices: bookings, event requests, payments and refunds are **kept** with the customer ID and no personal details, because venues need their booking history and the business needs payment records for accounting and tax. Reviews (S7) stay with "Former customer" as the author, or are removed; to be decided in S7.
5. The app calls Firebase Analytics' `resetAnalyticsData()` and signs out. The API never sends personal data to Firebase, and S1 does not set a Firebase user ID, so there is nothing else to delete there.
6. The same phone number can then sign up again as a new, empty account.

**Suspended customers** (A-03, from S2) cannot sign in, so they cannot delete their account from the app. Apple and Google expect deletion to be possible; how a suspended customer asks for deletion (for example through support) is decided in S2.

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
      settings/     language switch (S0)
      auth/         S1: phone entry, code entry
      profile/      S1: profile, delete account
        data/         API calls and models
        application/  Riverpod providers and state
        presentation/ screens and widgets; no business logic
    l10n/           app_en.arb (template), app_ar.arb
  test/  integration_test/        unit, widget and golden tests (mobile-dev); Maestro flows
                                  live in tests/e2e/mobile (qa-tester, section 2)
```

### 11.3 Configuration and flavors

- Three flavors, `dev`, `staging` and `prod`, each with its own app ID suffix and its own Firebase project, so test data never mixes with real data.
- Settings per flavor (API base URL, environment name) come from `--dart-define-from-file=config/<flavor>.json`. The app holds no secrets; anything in an app can be extracted.
- Firebase config files per flavor (`google-services.json`, `GoogleService-Info.plist`) are committed. They identify the project and are not secrets; their API keys are restricted to FeenGo's app IDs in the Google Cloud console.
- The language choice is kept in `shared_preferences`, so it is remembered before sign-in (C-03). After sign-in it is also saved to the profile, so the server can send messages in it.
- The theme follows the phone's light or dark setting, with no in-app control in S0, as the designer's placeholder spec proposes (`docs/design/s0/placeholder-home.md` on pull request #2). An in-app control later would need only a second preference.

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
- `theme.light.json`, `theme.dark.json`: semantic roles (`surface`, `onSurface`, `brandText`, `outline`, `selected`, `onSelected`, `focus`; the S0 set is in the table below) that point to base values. Apps use only these roles, never the raw palette.
- `fonts/`: IBM Plex Sans Arabic files and their Open Font License. It covers both Arabic and Latin.

**Build.** Style Dictionary 5 (`pnpm --filter @feengo/design-tokens build`) writes:

| Output | Used by |
| --- | --- |
| `dist/css/tokens.css`: custom properties for light under `:root:not([data-theme])` and `[data-theme='light']`, for dark under `[data-theme='dark']`, and dark under `@media (prefers-color-scheme: dark)` when no `data-theme` is set, so a page follows the system unless it chooses | both websites |
| `dist/ts/tokens.ts`: typed constants | websites, wherever CSS is not enough |
| `flutter/lib/feengo_design_tokens.dart`: `FeenGoColors.light` and `.dark`, type scale, spacing, plus the fonts declared in its `pubspec.yaml` | the app, which builds its `ThemeData` from it |

- Generated files are committed, so the app builds without Node and reviewers see exactly what changed. CI rebuilds and fails if the committed output differs.
- **Contrast check.** The build fails if a declared text and background pair in either theme is below WCAG AA (4.5 to 1 for body text, 3 to 1 for large text and interface parts), which protects Q-04 on every token change.
- **Swapping the design later is a single edit:** the designer changes the token JSON in `packages/design-tokens`, runs the build and commits. No app code changes, because apps refer only to semantic roles. This is why nothing in S0 waits for the final visual identity.

**The provisional palette and the contrast gate.** Primary `#B3204F` on the dark neutral `#1C2430` is 2.41 to 1, and success `#0E6B5E` on dark is 2.44 to 1, both below AA. Accent `#F2A93B` on the light neutral is 1.86 to 1. Used as they are, the C5 contrast check would fail, and design must not block the build. So:

- **C5 ships temporary dark-theme values that pass AA.** The roles and values below are the complete S0 colour set. C5 builds exactly these, so it does not depend on any other pull request. They match the designer's S0 placeholder spec (`docs/design/s0/placeholder-home.md`, on pull request #2, read 2026-11-18); if that spec changes before it merges, the designer updates both together.

| Role | Light | Dark | Used for |
| --- | --- | --- | --- |
| `surface` | `#FBF6EE` | `#1C2430` | Screen background, unselected segments |
| `onSurface` | `#1C2430` | `#FBF6EE` | Body text, titles, unselected labels |
| `brandText` | `#B3204F` | `#FBF6EE` | App name |
| `outline` | `#1C2430` | `#FBF6EE` | Control edges and dividers |
| `selected` | `#B3204F` | `#FBF6EE` | Fill of a selected control |
| `onSelected` | `#FFFFFF` | `#1C2430` | Label on a selected fill |
| `focus` | `#B3204F` | `#F2A93B` | Focus ring, drawn outside the control with a 2 dp gap in `surface` |

| Pair the contrast check tests | Light | Dark | Needed |
| --- | --- | --- | --- |
| `onSurface` on `surface` (text) | 14.52 | 14.52 | 4.5 |
| `brandText` on `surface` (large text) | 6.03 | 14.52 | 3.0 (also meets 4.5) |
| `onSelected` on `selected` (text) | 6.49 | 14.52 | 4.5 |
| `selected` against `surface` (interface part) | 6.03 | 14.52 | 3.0 |
| `outline` against `surface` (interface part) | 14.52 | 14.52 | 3.0 |
| `focus` against `surface` (interface part) | 6.03 | 7.82 | 3.0 |

  Success and accent are not used for text in S0; accent appears only as the dark focus ring. I recomputed every ratio above from the hex values with the WCAG formula.
- The designer replaces the temporary dark values with real tints when the design system is approved: a single edit in `packages/design-tokens`, with the contrast check proving it.

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
- **S0 test event (C7):** `foundation_test`, sent once when the placeholder home screen first appears, with parameters `language` and `theme`. Proved by a unit test with a mocked analytics service (the event is sent once, with its parameters), and checked in Firebase DebugView on a real iPhone and Android phone.
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

**Provisional proposal, confirmed in S3's architecture update and by the owner (question 10): platform links plus the Play Install Referrer, at no extra cost.**

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

**Q-04.** Text follows the phone's text size (no clamping in the app; `rem` units on the websites). Contrast is enforced by the token build (section 13). Golden tests and Playwright screenshots at the largest text size are part of each slice's review. Golden images are made and compared **on Linux CI only**, because font rendering differs between operating systems; the macOS job builds but does not run golden tests.

## 17. Pinned versions

All checked on **2026-11-18** from the sources the owner named: npm registry metadata (`npm view`), pub.dev's API, the Flutter release feed, Node's release index and Docker Hub. npm download counts and GitHub statistics were not reachable from this environment, so "usage" for npm packages rests on each package's standing and release history; pub.dev figures are its own 30-day download counts.

### 17.1 Runtimes, services and tools

| Item | Version | Released | Usage and maintenance | Why this version |
| --- | --- | --- | --- | --- |
| Node.js | 26.13.1 | 2026-11-10 | Active LTS ("Lithium"); maintenance LTS runs into 2029 | Current active LTS. Node 24 is in maintenance; 27 is not LTS. Image `node:26.13.1-alpine3.24`. |
| pnpm | 12.21.0 | 2026-11-13 | Current major since 2026-08; pnpm 10 and 11 still get fixes | Latest stable, works on Node 26; pinned through `packageManager`, so the container's pnpm 10.28 switches to it |
| TypeScript | 6.0.3 | 2026-04-16 | Microsoft; 7.0 (the native compiler) is out | **Not 7.0.2**: typescript-eslint 8.73 supports TypeScript below 6.1, and the NestJS 12 template uses `^6.0.2`. Move to 7 when the tools support it. |
| PostgreSQL | 18.7 | image 2026-11-15 | Current major; 19 is in release candidate | Newest stable major. Image `postgres:18.7-alpine3.24`. **Minimum on any host: PostgreSQL 15**, because the settings indexes use `NULLS NOT DISTINCT`. Nothing needs 18-only features, so a host on 15, 16 or 17 also works. |
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
| Vitest | 4.1.12 | 2026-10-15 | Very widely used; the 4.x line is still maintained after 5.0 | Matches the NestJS 12 template (`^4.1.2`); 5.x can follow once NestJS moves. Chosen over Jest by the owner on 2026-11-18 (question 4) |
| Next.js | 16.4.6 | 2026-11-09 | Vercel; 20 releases in 90 days | Current stable major |
| React | 19.3.1 | 2026-10-14 | Meta | Required by Next.js 16 |
| next-intl | 4.15.1 | 2026-11-12 | The most used translation library for the App Router; 13 releases in 90 days | Server-side `lang` and `dir`, ICU messages |
| Playwright | 1.65.1 | 2026-11-13 | Microsoft | Named in STACK.md |
| ESLint, typescript-eslint, eslint-config-next | 10.15.0, 8.73.0, 16.4.6 | 2026-11-13, 2026-11-16, 2026-11-09 | Standard | One linter for all TypeScript apps (NestJS's template now uses oxlint; one tool across the repository is simpler). See the ESLint note below the table. |
| Style Dictionary | 5.8.0 | 2026-11-03 | The most used token build tool; supports the W3C token format | Section 13 |
| openapi-typescript, openapi-fetch | 7.13.0, 0.17.0 | both 2026-02-11 | Widely used; slower releases lately; its peer range still says TypeScript 5 | Types from the contract for the websites, S1. web-dev confirms generation under TypeScript 6 in the first S1 pull request; if it fails, types are written by hand and checked by contract tests. |
| flutter_riverpod | 3.5.0 | 2026-11-06 | 2,919 likes, 4.3 million downloads in 30 days | Section 11.1 |
| go_router | 18.1.4 | 2026-11-09 | Flutter team, Flutter Favourite, 5.5 million downloads in 30 days | Section 11.1 |
| firebase_core, firebase_analytics | 5.2.0, 13.1.0 | 2026-11-16 | Google, 6.1 and 2.6 million downloads in 30 days | Q-06 |
| firebase_crashlytics | 6.1.0 | 2026-11-16 | Google, Flutter Favourite | Crash reports (STACK.md), from the first tester release in S1 |
| flutter_secure_storage | 11.2.0 | 2026-09-16 | 4,512 likes, 6.2 million downloads in 30 days, 160 of 160 pub points | Keychain and Keystore storage for tokens |
| dio | 5.11.1 | 2026-09-04 | 8,373 likes, 5.3 million downloads in 30 days | Interceptors for token refresh, timeouts and retries |
| shared_preferences | 2.5.6 | 2026-10-05 | Flutter team | Remembered language choice |
| package_info_plus | 10.2.2 | 2026-10-01 | Flutter Community, Flutter Favourite | App version for device registration |
| intl, flutter_localizations | SDK-pinned (0.20.x) | | Dart and Flutter teams | `gen-l10n`; `intl` is declared as `any` so the Flutter SDK chooses the matching version |
| flutter_lints, mocktail | 6.0.0, 1.0.5 | 2025-05-27, 2026-04-10 | Flutter team; widely used | Lint rules; test doubles |

**ESLint note: 10.15.0 with a recorded peer override, not 9.39.5.**

- **ESLint 9 is past end of life.** ESLint's own version-support table (`src/content/pages/version-support.md` in the eslint/eslint.org repository, read 2026-11-18) lists v9.0.0 to v9.39.5 as EOL, last release 2026-07-10, end of life 2026-08-06. npm's `maintenance` tag still points to 9.39.5, but no further 9.x fixes will come. Pinning it would mean starting on an unsupported linter.
- **The conflict:** eslint-config-next 16.4.6 depends on `eslint-plugin-react` 7.37.5, `eslint-plugin-jsx-a11y` 6.10.2 and `eslint-plugin-import` 2.32.0, whose ESLint peer ranges stop at `^9`. `eslint-plugin-react-hooks` 7.1.1 and typescript-eslint 8.73.0 already accept `^10`.
- **Checked on 2026-11-18:** in a throwaway folder I installed next 16.4.6, eslint-config-next 16.4.6 and TypeScript 6.0.3 with ESLint 10.15.0, then with 9.39.5, and linted the same sample files with `core-web-vitals` and `typescript` configs. Both versions gave identical results, including rules from each of the three capped plugins (`react/jsx-key`, `import/no-anonymous-default-export`, `jsx-a11y/alt-text`), `react-hooks/rules-of-hooks`, `@next/next/no-img-element` and `@typescript-eslint/no-unused-vars`. No crashes.
- **So:** ESLint 10.15.0 everywhere. C1 records the override in `pnpm-workspace.yaml`, because pnpm 12 no longer reads the `pnpm` field of `package.json`:

  ```yaml
  peerDependencyRules:
    allowedVersions:
      eslint-plugin-react>eslint: "10"
      eslint-plugin-jsx-a11y>eslint: "10"
      eslint-plugin-import>eslint: "10"
  ```

  With that, `pnpm peers check` reports no peer issues (confirmed by the reviewer), the install is clean and the exception is visible. C8 must still prove that lint runs cleanly with these pins and record it in the pull request.
- **Trigger to remove the override:** when all three plugins declare ESLint 10 in their peer ranges, or when a new eslint-config-next drops them, release-manager deletes the override in a dependency pull request. If any rule from them crashes under ESLint 10 before then, the fallback is to switch that rule off in the shared config and note it, not to return to an unsupported ESLint 9.

## 18. Dependency list per app

The owner's approval of this document approves exactly these lists. Versions are exact. Anything else needs a new approval.

### 18.1 Root workspace (release-manager)

| Package | Version | Kind | Increment |
| --- | --- | --- | --- |
| prettier | 3.10.1 | dev | C1 |
| @redocly/cli | 2.80.0 | dev | C1 (used by CI from C3) |
| eslint | 10.15.0 | dev | C1 (with the peer override in section 17) |
| typescript-eslint | 8.73.0 | dev | C1 |
| typescript | 6.0.3 | dev | C1 |
| @eslint/js | 10.0.1 | dev | C1 follow-up (release-manager; approved 2026-11-18, question 22) |

**About `@eslint/js` 10.0.1.** Approved by the owner on 2026-11-18 (question 22, DECISIONS.md); release-manager adds it in a small root-tooling pull request. It provides `js.configs.recommended`, ESLint's own core rules (`no-undef`, `no-const-assign`, `no-debugger` and others). Today `eslint.config.mjs` runs only typescript-eslint's recommended rules. Since ESLint 10, `@eslint/js` is no longer released together with `eslint`: 10.0.1 (2026-02-06, npm `latest`) is the newest 10.x, and its peer range `eslint: ^10.0.0` (optional) covers 10.15.0; its `engines` allow Node 24 and later. Checked on 2026-11-18 in a throwaway folder with Node 26.13.1 and pnpm 12.21.0: eslint 10.15.0, @eslint/js 10.0.1, typescript-eslint 8.73.0 and TypeScript 6.0.3 installed cleanly, `pnpm peers check` found no issues, and `extends: [js.configs.recommended, tseslint.configs.recommended]` reported the expected core-rule errors on a sample file. typescript-eslint's recommended set already turns off core rules that TypeScript checks better (such as `no-undef`) in `.ts` files. Plain `.js` and `.mjs` files that use Node globals such as `process` need `languageOptions.globals` in the shared config; listing them by hand avoids adding the `globals` package.

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
| ajv | 8.20.0 | dev | C2 (API tests check each response against `openapi.yaml`) |
| ajv-formats | 3.0.1 | dev | C2 |
| yaml | 2.9.1 | dev | C2 (reads `openapi.yaml` in tests) |

### 18.3 `apps/admin-web` and `apps/partner-web` (web-dev), the same list for each

| Package | Version | Kind | Increment |
| --- | --- | --- | --- |
| next | 16.4.6 | runtime | C8, C9 |
| react | 19.3.1 | runtime | C8, C9 |
| react-dom | 19.3.1 | runtime | C8, C9 |
| next-intl | 4.15.1 | runtime | C8, C9 |
| @feengo/design-tokens | workspace | runtime | C8, C9 |
| openapi-fetch | 0.17.0 | runtime | S1 (admin-web), S2 (partner-web) |
| jose | 6.2.17 | runtime | S1 (admin-web), S2 (partner-web): token check in `proxy.ts` and `requireAdmin()` |
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
| @testing-library/dom | 10.4.2 | dev | C8, C9 (required peer of the two packages around it) |
| @testing-library/jest-dom | 7.0.1 | dev | C8, C9 |
| @playwright/test | 1.65.1 | dev | C8, C9 (web-dev's own screenshot tests) |
| openapi-typescript | 7.13.0 | dev | S1 (admin-web), S2 (partner-web) |

### 18.4 `packages/design-tokens` (ui-ux-designer)

| Package | Version | Kind | Increment |
| --- | --- | --- | --- |
| style-dictionary | 5.8.0 | dev | C5 |

Assets, not packages: IBM Plex Sans Arabic font files with their Open Font License. The generated Dart package `feengo_design_tokens` depends only on the Flutter SDK.

**Proposed, awaiting the owner (question 23): a security override for a transitive dependency.** style-dictionary 5.8.0 reaches `glob` 13.0.7 and `minimatch` 10.2.6 through `@bundled-es-modules/glob` 13.0.6, and both have medium advisories (GHSA-3g3m-2fjr-6pw4, GHSA-g3hv-75wg-m249) that fail CI's dependency scan. No fixed 13.x glob or 10.x minimatch exists. The proposal is a scoped pnpm override in `pnpm-workspace.yaml`, `"@bundled-es-modules/glob>glob": "14.0.6"`, one major version past the parent's declared `^13.0.6`; it brings `minimatch` 11.0.9. On Node, `@bundled-es-modules/glob` re-exports the real `glob`, so the override changes the code that runs, and the token outputs are byte-identical with it. **Remove the override** when `@bundled-es-modules/glob` depends on a fixed glob, or style-dictionary stops using it.

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

### 18.6 `tests/` packages (qa-tester)

`tests/contract` (contract tests against a running API) and `tests/e2e/web` (journeys across the websites), added in C11:

| Package | Version | Kind | Package |
| --- | --- | --- | --- |
| vitest | 4.1.12 | dev | tests/contract |
| ajv | 8.20.0 | dev | tests/contract |
| ajv-formats | 3.0.1 | dev | tests/contract |
| yaml | 2.9.1 | dev | tests/contract |
| typescript | 6.0.3 | dev | both |
| @types/node | 26.6.6 | dev | both |
| @playwright/test | 1.65.1 | dev | tests/e2e/web |

Maestro is a command-line tool installed in CI, not a package; qa-tester pins its version in C11.

### 18.7 Fallback if Vitest is refused (question 4)

**Not used: Vitest was chosen (DECISIONS 2026-11-18).** The list is kept for reference only and is not approved.

If the owner keeps Jest, these replace the Vitest rows; everything else stays the same.

| Where | Remove | Add (exact versions) |
| --- | --- | --- |
| `apps/api` | vitest, @vitest/coverage-v8, vite | jest 30.5.2, ts-jest 29.4.15, @types/jest 30.0.0 |
| each website | vitest, vite, @vitejs/plugin-react, jsdom | jest 30.5.2, jest-environment-jsdom 30.5.2, @types/jest 30.0.0 (Next.js's built-in `next/jest` handles the transform) |
| `tests/contract` | vitest | jest 30.5.2, ts-jest 29.4.15, @types/jest 30.0.0 |

ts-jest 29.4.15 accepts TypeScript below 7, so it works with TypeScript 6.0.3. NestJS 12 is published as ES modules, so the API's Jest setup must run in Jest's ES module mode (`node --experimental-vm-modules`). That is the friction that made Vitest the proposal; it works, but it is less smooth.

### 18.8 CI tools (release-manager, C3 and C10)

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
- API variables: `APP_ENV`, `PORT`, `LOG_LEVEL`, `TRUST_PROXY`, `DATABASE_URL` (app role), `DATABASE_MIGRATOR_URL`, `REDIS_URL`, `JWT_SIGNING_KEYS` (JSON list of Ed25519 keys with IDs), `JWT_ISSUER`, `ACCESS_TOKEN_TTL_SECONDS`, `CUSTOMER_REFRESH_TTL_DAYS`, `CUSTOMER_SESSION_MAX_DAYS`, `ADMIN_REFRESH_IDLE_MINUTES`, `ADMIN_SESSION_MAX_HOURS`, `REFRESH_REUSE_GRACE_SECONDS`, `OTP_CODE_PEPPER`, `PHONE_HASH_PEPPER`, `TOTP_ENCRYPTION_KEYS`, `OTP_WHATSAPP_PROVIDER`, `OTP_SMS_PROVIDER`, provider credentials, `FAKE_OTP_CODE` (local and test only), `REFRESH_REUSE_DETECTION_DAYS`, `REFRESH_RATE_PER_SESSION_PER_HOUR`, `BFF_FORWARDING_KEYS` (one key per website server, section 4.6), per-IP ceilings.
- Website variables: `APP_ENV`, `API_BASE_URL`, `BFF_FORWARDING_KEY`, `JWT_VERIFY_KEYS` (the API's **public** keys only, for the proxy's token check) and `TRUST_PROXY_HOPS` (server side only; never `NEXT_PUBLIC_`).
- App: per-flavor JSON for `--dart-define-from-file`, no secrets.

### 19.3 Secrets

- Never in the repository. GitHub secret scanning with push protection, a repository setting the owner turns on (it is not a CI job), and the `frt_` prefix on refresh tokens help catch mistakes.
- **CI secrets** (store credentials later, deploy tokens) live in GitHub Environments (`staging`, `production`); production requires the owner's approval to deploy.
- **Runtime secrets** live in the host's secret store (section 20) and reach containers as environment variables.
- Rotation: JWT keys and TOTP encryption keys support several keys at once by ID, so they rotate without signing anyone out. Peppers rotate only with a planned migration.
- **JWT signing-key rotation, in this order**, because the website servers verify tokens themselves with `JWT_VERIFY_KEYS`:
  1. Make the new Ed25519 key pair. Add its public key to `JWT_VERIFY_KEYS` on every website server and to the API's verify list, keeping the old one, and deploy. Nothing signs with the new key yet.
  2. Switch the API to sign with the new key (`kid` in the header) and deploy. Tokens signed with either key now verify everywhere.
  3. After at least one access-token lifetime (15 minutes) plus a margin, remove the old public key from the websites and the API.

  Skipping step 1 would make the websites reject every new token. If manual rotation becomes a burden, the API can later publish a JWKS endpoint that the websites fetch; that would be a contract change.

## 20. Hosting options

All three run the same Docker images and meet the security baseline. **Requirement for any host: PostgreSQL 15 or later** (18 preferred), because the settings indexes use `NULLS NOT DISTINCT` (section 6.1); each option below offers it. **Prices are estimates from published list prices as I know them; I could not reach the vendors' price pages from this environment, so please confirm before choosing.** Figures are per month, before VAT.

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

GitHub Actions, every job written by release-manager. One workflow with one job per app, plus a final summary job that branch protection requires.

**Until the owner answers question 16, CI follows ROADMAP.md literally:** every push to any branch and every pull request runs every Linux job for all four apps, with no path filters. Only the macOS iOS job (C10) depends on the answer, and C10 is not merged before it.

| Trigger | Runner | Jobs |
| --- | --- | --- |
| Every push to any branch, and every pull request | Linux | **api**: install, lint, type check, unit tests, API tests against Postgres and Redis service containers, migrations up, down, up, generated-types check, Docker build. **admin-web**, **partner-web**: install, lint, type check, unit tests, `next build`, Playwright smoke. **design-tokens**: build, stale-output check, contrast check. **mobile**: `flutter analyze`, `flutter test` including golden tests (Linux only, section 16), translation check, debug Android build uploaded as an artifact. **contract**: Redocly lint of `openapi.yaml`. **security**: osv-scanner on all lockfiles. **e2e** (from C11): contract tests, Playwright journeys, Maestro smoke on an Android emulator. |
| To be decided (question 16) | macOS | **ios**: `flutter build ios --no-codesign` for the `staging` flavor |

**The iOS cost trade-off (question 16).** Estimates, because I could not check GitHub's current price page from here. On private repositories, GitHub has billed macOS minutes at about ten times Linux minutes; the Free plan includes 2,000 Linux-equivalent minutes a month and Team 3,000. An unsigned Flutter iOS build takes about 10 to 15 minutes, so 100 to 150 Linux-equivalent minutes each.

| Option | Builds a month (rough) | Cost |
| --- | --- | --- |
| A. As ROADMAP says: every push and pull request | 300 to 450 | Far beyond the included minutes; very roughly USD 300 to 500 a month in extra minutes |
| B. Pull requests to `main` that touch `apps/mobile` or `packages/design-tokens` (the architect's proposal) | 10 to 20 | About the size of the free allowance; at most a few tens of US dollars |
| C. As B, plus a nightly build of `main` | 40 to 50 | Roughly USD 30 to 60 |

A public repository has no minute charges, but makes the code public. Path filters for the Linux jobs would also save minutes, but they too depart from "every push builds all four apps", so they wait for the same answer.

**Contract lint rules (C3).** release-manager adds `redocly.yaml` at the root in C3. The file is not added now. Its content, checked on 2026-11-18 against the current contract with @redocly/cli 2.80.0 (it passes, and it fails when an operation's `x-roles` is removed):

```yaml
extends:
  - recommended
rules:
  rule/operation-x-roles:
    subject: { type: Operation, property: x-roles }
    assertions: { defined: true }
    severity: error
  rule/operation-x-rate-limit:
    subject: { type: Operation, property: x-rate-limit }
    assertions: { defined: true }
    severity: error
  rule/operation-x-idempotency-key:
    subject: { type: Operation, property: x-idempotency-key }
    assertions: { defined: true }
    severity: error
```

A new endpoint without its roles, rate limits or idempotency note then fails CI.

- **Secret scanning** with push protection is a GitHub repository setting for the owner to turn on, not a CI job.
- Caches: the pnpm store, the pub cache, Gradle and the Flutter SDK.
- Deployment to staging (from S1) and signed tester builds with Fastlane are added by release-manager once the host is chosen; they are outside S0.

**Notes for C3, learned in C1.**

- **Database roles in CI.** GitHub Actions service containers start before the repository is checked out, so they cannot mount `docker/postgres/initdb/`. The api job therefore runs `docker/postgres/initdb/01-create-roles.sh` itself, from the runner, against the Postgres service, after checkout and before migrations. It sets `PGHOST` (and `PGPORT`) to the service and `PGPASSWORD` to the service's superuser password, with `POSTGRES_USER`, `POSTGRES_DB`, `FEENGO_MIGRATOR_PASSWORD` and `FEENGO_APP_PASSWORD` in the step's environment. The runner needs a psql of version 15 or later for `\getenv`. The passwords are throwaway CI values, not secrets.
- **Redocly telemetry off.** The contract job sets `REDOCLY_TELEMETRY=off`, so @redocly/cli sends no usage data from CI. Without it, the CLI tries to reach its telemetry host (`otel.cloud.redocly.com`) on each run, which this environment's network refused.

## 22. Questions for the owner

1. **Hosting.** Choose option A, B or C (section 20) before S1. I recommend A.
2. **Lawyer on data location.** Is hosting outside Egypt allowed for production, and what licence or permit does PDPL require? Staging can start before the answer.
3. **Code vendors.** Choose the WhatsApp and SMS providers (section 7.3) and start Egyptian SMS sender ID registration and the Meta Business verification now, because both take time.
4. **Vitest instead of Jest.** **Answered 2026-11-18:** Vitest for the API, website and contract tests; STACK.md updated (DECISIONS.md). Original question: STACK.md listed Jest. NestJS 12's own template has moved to Vitest, and Jest is awkward with ES modules. I propose Vitest for the API, website and contract tests (its test syntax is almost the same as Jest's). This changes a line in STACK.md, so it needs your approval. If you refuse, section 18.7 has the exact Jest list. Needed before C2.
5. **Account deletion (C-04).** Approve the proposal in section 10, including the "sign in again within 10 minutes" step. With a lawyer: should a keyed hash of the phone be kept so no-show strikes survive deletion? Should deletion wait while a paid deposit is pending (from S6)? How long are anonymised records kept?
6. **Analytics consent.** Must the app ask for consent before sending analytics, under PDPL? The design supports both.
7. **Phone numbers.** Accept Egyptian numbers (+20) only at launch? (`auth.otp.allowed_country_codes`, changeable later.)
8. **Name at sign-up.** May a new customer skip giving a name in S1? The proposal is yes: the app asks right after the first sign-in, the API allows it to be empty, and a name becomes required before the first booking in S4.
9. **Admin sign-in (A-01).** Approve email, password and authenticator app, with admin accounts created only by the seed command that you run on the server (section 9). Note the known weakness: anyone who knows an admin's email can lock that admin out for 15 minutes (section 9.1).
10. **Deep links (C-08, S3).** Approve the free approach (no venue after an iOS install), or budget for a paid linking service.
11. **Domain and app IDs.** Which domain will FeenGo use (for the API, the websites and shared links), and which app IDs (for example `app.feengo.customer`)? Needed before C6 for the IDs and before S1 staging for the domain.
12. **Firebase projects.** Please create `feengo-dev`, `feengo-staging` and `feengo-prod` (or allow release-manager to prepare the steps for you). Needed for C7.
13. **Environments.** Agree that there is no separately hosted development environment, and that production is set up shortly before the first public release.
14. **Billing tables.** DECISIONS says the billing structure exists in the database "from the start". The proposal is to create the plan tables in S2, together with the venues they belong to, switched off. Agree?
15. **Additional endpoint.** The contract adds `GET /v1/admin/me`, which was not in the S1 list, so the back office can show who is signed in and can add the API's deny-list check to every page (section 8.3). Agree? If not, the admin pages stay protected by the proxy's and `requireAdmin()`'s token checks and by the API refusing every data call (section 8.3).
16. **iOS CI and path filters.** ROADMAP.md says the pipeline "builds all four apps on every push and pull request". Doing that for iOS on macOS costs far more than everything else (section 21, options A to C). Choose A (as written, several hundred US dollars a month), B (pull requests to `main` that touch the app, the architect's proposal), or C (B plus nightly). Also say whether Linux jobs may skip apps that did not change. Until you answer, Linux jobs run for every app on every push, and C10 waits. Needed before C10.
17. **`customers` module.** STACK.md lists the modules auth, venues, availability, bookings, events, payments, notifications, settings and admin. The design adds `customers` for profile data (section 4.2). Agree?
18. **Code rules as admin settings.** Make the code expiry, number of tries and lock time (and the resend and request limits) admin settings with the ranges in section 6.3, rather than fixed configuration? The defaults are the PRD's values either way. Needed before S1.
19. **C-01 and "done" for S1.** ROADMAP.md says a slice is done when tests pass for all of its acceptance checks. C-01's check needs venue pages and booking, which come in S3 and S4, so S1 can only test part of it (section 23). Proposal: S1 counts as done with C-01's S1 part tested, and the rest of C-01 is checked in S3 and S4.
20. **S1 testers, internal or external?** Internal TestFlight testers (members of your App Store Connect team, up to 100) need no review. External testers need Apple's Beta App Review, which needs a demo account that can sign in without a real phone. If S1 goes to external testers, the demo sign-in (Q-07) must be designed in S1 rather than before the public release.
21. **Node 26 in every environment. Needed before C2.** **Answered 2026-11-18:** option (b): in cloud sessions the session-start hook installs Node 26.13.1 from nodejs.org, checks its checksum, caches it and writes PATH to `$CLAUDE_ENV_FILE`; `nvm use` with `.nvmrc` on developer machines, `actions/setup-node` with `node-version-file: .nvmrc` in CI; release-manager writes the hook change, merged under the rule in `CLAUDE.md` (DECISIONS.md). `engineStrict` refuses any Node outside `>=26.13.1 <27`. The cloud development container has Node 22, and C1 could only be built with a Node 26 downloaded for one session. Choose one:
    - (a) pnpm's `devEngines.runtime` (`node` 26.13.1, `onFail: "download"`) in the root `package.json`, so pnpm fetches the pinned Node on every machine and in CI.
    - (b) `.claude/hooks/session-start.sh` installs Node 26.13.1 in cloud sessions only. Developer machines use `.nvmrc`, and CI uses `actions/setup-node` with `node-version-file: .nvmrc`.
    - (c) Both.

    **Test of (a), 2026-11-18,** with Node 22.23.5 on PATH, a package.json pinned to pnpm 12.21.0 and `devEngines.runtime` node 26.13.1 with download. pnpm 12.21.0 supports the field: it resolved `node@runtime:26.13.1`. But `pnpm install` failed with exit code 1: to write checksums for every platform into the lockfile, pnpm also fetches `https://unofficial-builds.nodejs.org/download/release/v26.13.1/SHASUMS256.txt` (the musl builds), and this environment's network refuses that host. Limiting `supportedArchitectures` did not avoid the fetch. The Node mirror setting is read only from the global pnpm config or environment, not from `pnpm-workspace.yaml`. After the failed install, `pnpm exec node -v` printed a warning, then ran **v22.23.5** and exited 0. So when the runtime download fails, `pnpm exec` falls back to the system Node with only a warning, and exits 0. A plain download from nodejs.org works here: `pnpm env use --global 26.13.1` fetched 26.13.1 and ran it. The successful path of (a) could not be shown from here.

    **Recommendation: (b).** It fixes the one environment that lacks Node 26, without depending on a host this environment refuses. It leaves `package.json` and the lockfile alone. The hook downloads the Linux x64 build from nodejs.org, checks its SHA-256 against `SHASUMS256.txt`, unpacks it outside the repository, and puts it first on PATH for the session. It reads the version from `.nvmrc`, and like today's hook it never fails the session start: the download has a timeout, and the unpacked Node is cached so later sessions reuse it. A SessionStart hook runs in a child process, so changing PATH there does not reach the session; the hook keeps PATH for the session by writing it to `$CLAUDE_ENV_FILE`. **Not yet shown: the hook itself.** The pull request that adds it must show `node -v` printing 26.13.1 in a new cloud session. Revisit (a) if the cloud network allows `unofficial-builds.nodejs.org`. Option (a) or (c) changes the root `package.json`, so release-manager would make it in a small follow-up pull request that you merge. Option (b) changes `.claude/`, so it also goes in a small pull request that you merge, with release-manager proposed as its writer.
22. **Add `@eslint/js` 10.0.1** to the root dev dependencies (section 18.1). **Answered 2026-11-18:** approved, with `js.configs.recommended` turned on; release-manager adds it (DECISIONS.md). Original question: it turns on ESLint's own recommended rules (`js.configs.recommended`) in `eslint.config.mjs`. Today only typescript-eslint's recommended rules run. It is a new dependency, so it needs your approval. If you approve, release-manager adds it in a small root-tooling pull request.
23. **Security override for style-dictionary's glob (C5).** Approve the scoped override `"@bundled-es-modules/glob>glob": "14.0.6"` described in section 18.4? It fixes two medium advisories that fail CI's dependency scan, adds no new package, and leaves the token outputs byte-identical. Without it, C5 cannot pass CI: the other routes are to accept the advisories (weakening the scan, which needs you too) or to replace style-dictionary. Needed before C5 merges, and so before C8 and C9.

## 23. Traceability

| ID | Slice | Covered by | What the slice proves |
| --- | --- | --- | --- |
| Q-02 | S0 | Section 16; `minSdk 26` and iOS 15.0 in C6; CI iOS build C10 | The shell builds for and runs on iOS 15 and Android 8; the ROADMAP done-check runs it on a real iPhone and Android phone. No version conflict found. |
| Q-04 | S0 | Sections 11.4, 12 and 13 (contrast check in the token build); golden tests and Playwright screenshots at the largest text size (C6, C8, C9, C11) | Text follows the system size; every token pair passes WCAG AA in light and dark mode |
| Q-05 | S0, S1 | Security baseline mapped in sections 4.3 to 4.6 (headers, validation, roles, logging and redaction, client IP), 5.1 (database roles), 7 (code limits), 8 (tokens and web sessions), 9 (admin sign-in, append-only log), 19.3 (secrets), 20 (hosting baseline), 21 (dependency scan) | S0: secrets only in the environment, dependency scan in CI, the log-redaction test. S1: the code limits and race tests (section 7.5), the refresh tests (section 8.1), the forged-cookie tests (section 8.3), and the append-only test for the activity log. Hosting encryption and HTTPS are proved when staging is set up. |
| Q-06 | S0 | Section 15.1; increment C7 | The `foundation_test` event is sent once with its parameters (unit test with a mocked analytics service) and arrives in Firebase DebugView from both platforms. The full event list grows with each slice. |
| Q-07 | S1, partly | Section 10; `DELETE /v1/me` | **S1 proves** account deletion works inside the app. **Not yet:** the demo account for store reviewers, designed before the first public release, or in S1 if testers are external (question 20). |
| C-01 | S1, partly | Section 11.1 (route guard and return path); no sign-in wall on the home screen | **S1 proves:** a visitor can open the app and use the home screen and the language switch without an account; opening the profile, the only screen that needs an account in S1, sends the visitor to sign-in, and after signing in they return to the profile. **Not yet:** searching and opening venue pages (S3) and "booking asks them to sign in, then returns them" (S4), which reuse the same mechanism. Whether this partial proof is enough for S1 to count as done is question 19. |
| C-02 | S1 | Section 7; settings in 6.3; `POST /v1/auth/otp/request`, `POST /v1/auth/otp/verify`, `POST /v1/auth/refresh`, `POST /v1/auth/logout`; tables `otp_challenges`, `devices`, `refresh_tokens` | Code by WhatsApp, with SMS when WhatsApp refuses the message and SMS on request at resend (with the fake provider in CI and a real vendor on staging); expiry after 5 minutes, lock for 15 minutes after five wrong tries, limits per phone and per device, and the race tests in section 7.5. Late fallback after a WhatsApp delivery failure waits for the vendor choice (section 7.1). |
| C-03 | S1 | Sections 11.3 and 14; `language` in `PATCH /v1/me` and `POST /v1/auth/otp/request`; `customers.language` | Every S1 screen works in both languages, Arabic right to left, and the choice is remembered on the phone and in the profile |
| C-04 | S1 | Section 10; `GET`, `PATCH` and `DELETE /v1/me`; `customers` constraints | Name and optional email can be edited; deletion from inside the app removes personal data and ends every session |
| A-01 | S1 | Sections 8.3 and 9.1 to 9.2; `POST /v1/admin/auth/sign-in`, `POST /v1/admin/auth/totp/verify`, `GET /v1/admin/me`; tables `admin_users`, `admin_sign_in_attempts` | No admin screen or admin endpoint works without both the password and the authenticator code, including with a forged cookie or the password step alone, for full page loads, client-side (RSC) navigations, prefetches and server actions; checked in `proxy.ts`, in `requireAdmin()` and by the API |
| A-11 | S1 | Sections 5.3 and 9.3; `GET /v1/admin/activity-log`; table `admin_activity_log` with its grants and trigger | Sign-ins, sign-outs, locks, seed-command actions (with the operator's name) and settings changes are recorded with who, what and when; a test shows that `UPDATE`, `DELETE` and `TRUNCATE` on the table fail for the app role, and `A-11 the app role cannot update, delete or truncate activity-log rows` checks the grants with `has_table_privilege`; the trigger tests run as a role that holds those privileges, such as `feengo_migrator` (section 5.1) |

## 24. Proposed decisions, awaiting the owner

These are the architect's proposals of 2026-11-18. Only entries marked "Decided" are in `docs/DECISIONS.md`, because that file holds only decisions the owner has made. Each entry says how it is decided. "With this document" means approving this document approves it; "question N" means it is decided by the answer to that question in section 22. Once decided, each entry moves to `docs/DECISIONS.md` with the date of the owner's answer.

### 24.1 Versions pinned for S0 and S1 (with this document)

Node 26.13.1, pnpm 12.21.0, TypeScript 6.0.3, ESLint 10.15.0, PostgreSQL 18.7, Redis 8.10.3, Flutter 3.50.0, NestJS 12.5.1, Next.js 16.4.6, React 19.3.1, plus the exact lists in sections 17 and 18, all checked against their registries on 2026-11-18. TypeScript stays below 6.1 because of typescript-eslint's peer range. ESLint is on 10 because 9 reached end of life on 2026-08-06; three plugins inside eslint-config-next still declare ESLint 9 only, so a recorded peer override covers them until they catch up (section 17).

### 24.2 pnpm workspaces, no build orchestrator yet (with this document)

The API, both websites, the shared packages and qa-tester's test packages form one pnpm workspace with one lockfile and exact versions. Flutter stays outside it and reads the tokens through a path dependency. Turborepo or Nx can be added later without moving folders. A shared web component package is created only when both websites need it. Root files and every CI job belong to release-manager; only one open pull request touches the lockfile at a time.

### 24.3 NestJS 12 on Node 26 LTS, with TypeScript 6.0 (with this document); Vitest (question 4)

**Vitest: Decided 2026-11-18, see DECISIONS.md.** The rest of this entry is decided with this document.

NestJS 12 on Express, as ES modules, on Node 26, the active LTS release. Vitest 4 for tests, as NestJS 12's own template uses, because Jest is awkward with ES modules. Vitest replaced Jest in STACK.md; decided by question 4 on 2026-11-18. The unused Jest list is kept in section 18.7.

### 24.4 API conventions (with this document)

Business endpoints under `/v1`; health unversioned. One RFC 9457 error shape with a stable `code` that clients translate, a `default` error response on every operation, and unknown body fields and query parameters rejected. Request validation with zod; responses checked against the contract in tests. Bodies never logged, wildcard redaction, provider calls never logged, and a test that proves a known code and token never reach the logs.

### 24.5 Kysely for database access and migrations (with this document)

Kysely and its migrator, types generated from the database. FeenGo's key rules are SQL features (row locks, partial indexes, check constraints, an append-only log) that Kysely writes directly, and every migration has an `up` and a `down`; down migrations are refused outside development. Prisma, Drizzle and TypeORM were considered and rejected (section 5.1). The API connects with a role that cannot change the schema or the activity log.

### 24.6 "Venues near me" is a bounding box plus a distance formula (with this document)

An indexed latitude and longitude box, then haversine sorting in a plain SQL function. No extension, works on every managed PostgreSQL, milliseconds at launch scale. `earthdistance` or PostGIS can be added later from the same columns.

### 24.7 Settings stored as typed rows with admin limits, categories and versions (with this document)

`setting_definitions` and `settings`, with platform and venue rows, an optional booking category on each row, admin limits per category, and a version per row. Containers cache platform settings and reload as soon as Redis announces a change. Every change writes a `setting.changed` activity entry; the R-04 change log comes in S4.

### 24.8 Code rules as admin settings (question 18)

The code expiry, number of wrong tries and lock time, and the resend and request limits, as admin settings with ranges, defaulting to the PRD's values.

### 24.9 Phone codes behind one provider interface (with this document); vendor (question 3)

The API makes the codes, stores only their HMAC, and hands them to a provider interface: WhatsApp first, SMS in the same request if WhatsApp refuses, SMS with a new code on request at resend, and a fake provider for local runs and CI. Late fallback through a signed delivery-receipt webhook is added once the vendor is chosen. Counters, locks and "only once" rules are atomic, in the places listed in section 7.5, with tests for each race.

### 24.10 Short access tokens, rotating refresh tokens, no tokens in web pages (with this document)

15-minute Ed25519 JWTs; random single-use refresh tokens stored as hashes, with one successor only, returned again within a 10-second grace period from an encrypted cache, and the whole session ended on later reuse. The app keeps the refresh token in the Keychain or Keystore. The websites keep tokens in HttpOnly cookies set only in route handlers and `proxy.ts`. The session is checked on every request, including client-side navigation, by a JWT check in `proxy.ts`, again by `requireAdmin()` in every admin page, server action and route handler, and finally by the API on every data call. The `mfaToken` waits in its own short cookie until the second step. `GET /v1/admin/me` (question 15) adds the API's deny-list check to page loads; if it is refused, the token checks and the API's refusal of every data call still protect every page, and an ended session can show at most an empty frame for up to 15 minutes.

### 24.11 Admin sign-in with email, password and an authenticator code (question 9)

Argon2id password, then a TOTP code; admin accounts only from server commands that refuse to print secrets outside an interactive terminal and record the operator; failures and locks kept only in `admin_sign_in_attempts`; every admin action in the append-only `admin_activity_log`.

### 24.12 Account deletion anonymises the customer and keeps business records (question 5)

After a fresh sign-in within 10 minutes: personal fields removed, sessions revoked, devices removed, in one transaction across modules; booking and payment records from later slices kept without personal details. Subject to a lawyer.

### 24.13 Flutter uses Riverpod and go_router (with this document)

`flutter_riverpod` 3 without code generation, `go_router` with the sign-in redirect that returns the customer where they were (C-01), three flavors each with its own Firebase project. The theme follows the phone in S0.

### 24.14 Design tokens built with Style Dictionary, outputs committed (with this document)

W3C-format tokens, Style Dictionary 5 output to CSS, TypeScript and Dart, committed outputs checked in CI, and a contrast gate. C5 ships temporary dark-theme values that pass, from the designer's S0 placeholder spec; the real design replaces them with one edit.

### 24.15 Translations stay in each product, in ICU format (with this document)

ARB for the app, JSON with next-intl for the websites, the API only for text it sends; no shared package; a glossary for shared terms; key parity checked in CI; bilingual database text as `_en` and `_ar` columns.

### 24.16 Q-02 phone versions confirmed (finding, with this document)

Flutter 3.50.0 and the FlutterFire plugins need iOS 15.0 and Android API 24, so Q-02's iOS 15 and Android 8 (API 26) are supported without conflict. The iOS build must use Swift Package Manager.

### 24.17 Deep links through Universal Links, App Links and the Play Install Referrer (question 10, provisional until S3)

Firebase Dynamic Links is shut down. Free platform links with the Play Install Referrer, or a paid linking service if iOS deferred links are needed.

### 24.18 CI cadence (question 16)

Linux jobs for every app on every push and pull request. The iOS build on macOS for pull requests to `main` that touch the app or the tokens (option B in section 21), because running it on every push costs several hundred US dollars a month.

### 24.19 Hosting (question 1)

Option A, DigitalOcean in Frankfurt, recommended over Hetzner (cheapest, most work) and Google Cloud in Doha or Dammam (closest, dearest). Data location subject to the lawyer (question 2).

### 24.20 Node 26 in cloud sessions through the session-start hook (question 21)

**Decided 2026-11-18, see DECISIONS.md.**

Option (b): `.claude/hooks/session-start.sh` installs the Node version in `.nvmrc` from nodejs.org, checked against its SHA-256, in cloud sessions only. Developer machines use `.nvmrc`, CI uses `actions/setup-node` with `.nvmrc`, and the Docker images pin Node themselves. The hook keeps PATH for the session through `$CLAUDE_ENV_FILE`, uses a download timeout and caches the unpacked Node, so it never fails the session start. Not yet shown: the hook itself; its pull request must show `node -v` printing 26.13.1 in a new cloud session. pnpm's `devEngines.runtime` download was tested and is not used for now: in this environment `pnpm install` fails on the musl checksum host, and `pnpm exec` then runs with the system Node. Needed before C2.

### 24.21 ESLint's core recommended rules through `@eslint/js` 10.0.1 (question 22)

**Decided 2026-11-18, see DECISIONS.md.**

Add `@eslint/js` 10.0.1, the newest 10.x, whose peer range covers ESLint 10.15.0, and extend `js.configs.recommended` before typescript-eslint's recommended set in `eslint.config.mjs`.

### 24.22 Security override for style-dictionary's glob (question 23)

Override `glob` to 14.0.6 only under `@bundled-es-modules/glob`, as section 18.4 describes, and remove it once that package depends on a fixed glob or style-dictionary drops it. Once the owner approves, record it in DECISIONS.md.
