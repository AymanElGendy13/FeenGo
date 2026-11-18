# FeenGo decisions

A running log of decisions, newest first. Add an entry whenever something significant is decided, so it is not argued again. Each entry says what was decided and why.

## 2026-11-18: Hosting options prepared; the owner chooses before S1

Three Docker hosting options are in `docs/ARCHITECTURE.md` section 20, each checked against the security baseline, with estimated monthly costs and data location: DigitalOcean in Frankfurt (recommended: managed encrypted PostgreSQL and backups, about USD 55 a month until production), Hetzner in Germany or Finland (cheapest, but we run the database, encryption and backups ourselves), and Google Cloud in Doha or Dammam (closest to Egypt, most complete tooling, highest price). None stores data in Egypt, so a lawyer must confirm what PDPL requires before production holds real data. Proposed by the architect; the choice is the owner's.

## 2026-11-18: CI runs on Linux for every push, iOS on macOS for pull requests to main

One GitHub Actions workflow with a job per app, run when that app changed, and one required summary job. An unsigned iOS build runs on macOS only for pull requests to `main` that touch the app or the tokens, because macOS minutes cost several times more. Dependencies are scanned with osv-scanner for both npm and pub. Each S0 increment adds its own job, so every increment lands alone. Proposed by the architect.

## 2026-11-18: Deep links through Universal Links, App Links and the Play Install Referrer

Firebase Dynamic Links shut down in August 2025. Shared venue links (C-08, S3) will use iOS Universal Links and Android App Links on FeenGo's own domain, with a small web page and store badges when the app is not installed, and the Play Install Referrer to open the venue after an Android install. The free approach cannot open the venue after an iOS install; a paid linking service can, and is the fallback if marketing needs it. Analytics is Firebase Analytics with Google's recommended event names where they exist, and no personal data. Proposed by the architect; awaiting the owner.

## 2026-11-18: Q-02 phone versions confirmed against Flutter and Firebase

Flutter 3.50.0 and the FlutterFire plugins require at least iOS 15.0 and Android API 24. Q-02's iOS 15 and Android 8 (API 26) are both supported, with no conflict. The app sets `minSdk 26` and iOS 15.0. The iOS build must use Swift Package Manager, because Firebase's Apple SDK 13 is no longer published to CocoaPods. Checked by the architect.

## 2026-11-18: Translations stay in each product, in ICU format

The app uses ARB files with Flutter's `gen-l10n`, the websites use JSON files with next-intl, and the API keeps only the text it sends. All use ICU MessageFormat. There is no shared translation package, because each audience uses different words; a glossary in `docs/design/` keeps shared terms consistent. CI fails if a key is missing in either language. API errors carry a stable code that each client translates. Bilingual database text is stored as `_en` and `_ar` column pairs. Proposed by the architect.

## 2026-11-18: Design tokens built with Style Dictionary, outputs committed

`packages/design-tokens` holds the tokens in the W3C design tokens format. Style Dictionary 5 generates CSS custom properties and TypeScript for the websites, and a Dart package for the app. Generated files are committed, CI fails if they are stale, and the build fails if any text colour pair misses WCAG AA. Apps use semantic roles only, so replacing the provisional design later is one edit in the package. Proposed by the architect.

## 2026-11-18: Flutter uses Riverpod and go_router

`flutter_riverpod` 3 for state, written without code generation for now, and `go_router` for navigation, deep links and the sign-in redirect that returns the customer where they were (C-01). Riverpod is actively maintained and easy to test; `flutter_bloc` has not had a release since May 2025. Three flavors (dev, staging, prod), each with its own Firebase project. Proposed by the architect.

## 2026-11-18: Account deletion anonymises the customer and keeps business records

Deleting an account (C-04) removes the name, email and phone, ends every session and removes devices, after a fresh sign-in within 10 minutes. Booking and payment records from later slices are kept without personal details. Proposed by the architect; subject to the owner and a lawyer.

## 2026-11-18: Admin sign-in is email, password and an authenticator code

Admins sign in with email and password (Argon2id), then a TOTP code from an authenticator app (A-01). Admin tokens open admin endpoints only after both steps. Admin accounts are created only by a server seed command; there is no sign-up or invite endpoint. Every admin action goes into `admin_activity_log` in the same transaction, and the database itself refuses updates and deletes on that table (A-11). Proposed by the architect; awaiting the owner.

## 2026-11-18: Phone codes behind one provider interface, vendor still open

The API makes the 6-digit codes, stores only their hashes, and hands them to a provider interface that sends by WhatsApp first and SMS if WhatsApp fails, with a fake provider for local runs and CI. The expiry, the number of wrong tries and the lock time are admin settings, even though the PRD states them as fixed values, so they can be tuned without a release. Codes are rate-limited per phone, per device and per IP address. The WhatsApp and SMS vendors are the owner's choice. Proposed by the architect.

## 2026-11-18: Short access tokens, rotating refresh tokens, no tokens in web pages

Access tokens are 15-minute JWTs signed with Ed25519 (`jose`). Refresh tokens are random, stored only as hashes, single-use and rotated, and a replayed one ends the session. The app keeps the refresh token in the Keychain or Keystore through `flutter_secure_storage`, and the access token only in memory. The websites keep both tokens in HttpOnly, Secure, SameSite=Strict cookies set by their own Next.js server, which calls the API, so page scripts can never read them. Logout and deletion take effect at once through a Redis deny-list. Proposed by the architect.

## 2026-11-18: Settings stored as typed rows with admin limits and versions

`setting_definitions` describes each setting (type, unit, whether a venue may override it, labels in both languages). `settings` holds platform rows, with the admin's limits, and venue rows, each with a version number for safe concurrent edits. API containers cache platform settings in memory and reload as soon as Redis announces a change, so a change in the back office reaches the app within seconds with no release (R-01). The change log (R-04) is added in S4. Proposed by the architect.

## 2026-11-18: "Venues near me" is a bounding box plus a distance formula

C-05 filters venues on an indexed latitude and longitude box, then sorts by the haversine distance from a plain SQL function. No extension is needed, every managed PostgreSQL supports it, and at launch scale it answers in milliseconds, well inside Q-01. If venues pass about 50,000, a migration can add an `earthdistance` index or PostGIS from the same columns. Proposed by the architect.

## 2026-11-18: Kysely for database access and migrations

The API uses Kysely, a typed SQL query builder, and its built-in migrator, with types generated from the database. FeenGo's key rules (row locks for the last slot, partial indexes, check constraints, an append-only log) are SQL features that Kysely writes directly, and every migration has an `up` and a `down`. Prisma was rejected for having no down migrations or row-lock API and a major version in release candidate; Drizzle for having no down migrations and 1.0 in release candidate; TypeORM for its decorator entities and quality history. The API connects with a database role that cannot change the schema or the activity log. Proposed by the architect.

## 2026-11-18: API conventions: versioned paths, one error shape, zod validation

Business endpoints live under `/v1`; health checks are unversioned. Every error is an RFC 9457 problem with a stable `code` that clients translate. Request bodies are validated with zod and unknown fields are rejected; API tests check responses against `docs/api/openapi.yaml`. Logs are structured JSON (pino) with a request ID and with codes, tokens and personal data redacted. Proposed by the architect.

## 2026-11-18: NestJS 12 on Node 26 LTS, with TypeScript 6.0 and Vitest

The API uses NestJS 12 on Express, as ES modules, on Node 26.13.1, the active LTS release. TypeScript is pinned at 6.0.3 rather than 7.0 because typescript-eslint supports only versions below 6.1. Unit and API tests use Vitest 4, as NestJS 12's own template now does, because Jest is awkward with ES modules. Using Vitest instead of the Jest named in `docs/STACK.md` needs the owner's approval. Proposed by the architect.

## 2026-11-18: pnpm workspaces for the TypeScript apps, no build orchestrator yet

The API, both websites and the shared packages are one pnpm 12 workspace with one lockfile and exact versions. The Flutter app stays outside it and reads the design tokens through a path dependency. Turborepo or Nx is not needed for three apps and can be added later without moving folders. A shared web component package is created only when both websites need it. Root tooling belongs to release-manager. Proposed by the architect.

## 2026-11-18: Versions pinned for S0 and S1

Node 26.13.1, pnpm 12.21.0, TypeScript 6.0.3, PostgreSQL 18.7, Redis 8.10.3, Flutter 3.50.0, NestJS 12.5.1, Next.js 16.4.6, React 19.3.1, plus the exact library lists in `docs/ARCHITECTURE.md` sections 17 and 18. All checked against their registries on this date. Approving the architecture approves exactly these lists. Proposed by the architect.

## 2026-11-18: English first, Arabic second

English is the app's primary and default language, and screens are designed in English first. Arabic remains a full second language: every text exists in both, and every screen is checked right to left. Replaces the earlier "Arabic first" wording in `CLAUDE.md`. Decided by the owner.

## 2026-11-18: PostgreSQL without PostGIS

Plain PostgreSQL is enough for launch. Venues store latitude and longitude, and "venues near me" (C-05) is a distance calculation in Postgres, which is fast enough at launch scale. PostGIS can be added later by a migration that derives a location column from the stored latitude and longitude. Replaces PostGIS in the stack entry below. Decided by the owner.

## 2026-11-18: AWS later, low-cost hosting until then

An AWS subscription waits until the app needs to scale. Until then the API and dashboards run as Docker containers on a low-cost host, chosen before S1 from options the architect prepares. Because everything is in containers, moving to AWS later is a move, not a rewrite. Each hosting option must meet the security baseline in `docs/STACK.md`: HTTPS, database and backups encrypted at rest, a secrets store, and separate development, staging and production. The options also note where data is stored, for Egypt's Personal Data Protection Law. Replaces AWS in the stack entry below. Decided by the owner.

## 2026-11-18: Small, single-feature deliveries

Work inside a slice is delivered as small pull requests, one feature each, reviewed and merged before the next feature starts. Design specs and documents for the next slice may be prepared alongside. Small changes are easier to review, test and roll back. Decided by the owner.

## 2026-11-18: The app is called FeenGo

"Feen" (where) plus "Go": "where to go?" in Egyptian Arabic and English. Always written with a capital G, so it is not read as "Fingo".

## 2026-11-18: The tech stack is confirmed

Flutter, NestJS, PostgreSQL with PostGIS, Redis, Next.js, Paymob, Firebase, Google Maps, AWS, GitHub Actions. Details in `docs/STACK.md`.

## 2026-11-18: Build and release one feature slice at a time

Slices S0 to S7 in `docs/ROADMAP.md`. Each slice ships to testers. The first public release follows S6.

## 2026-11-16: Booking rules are settings, not code

Booking windows, cancellation policies, deposits, confirmation mode, no-show limits, commission and fees are all stored settings with admin limits and venue choices. The right values will only be known after talking to venues.

## 2026-11-16: Only venues that agree are listed

No scraped listings. Each venue signs up, accepts the partner agreement and is approved before it appears.

## 2026-11-16: Free first year

No subscriptions or fees for venues or customers for about 12 months after launch. The billing structure exists in the database from the start but is switched off.

## 2026-11-16: Payments through Paymob, not store in-app purchase

Bookings and events are real-world services, so they are paid through Paymob.

## 2026-11-14: Three products on one backend

A Flutter customer app, a Next.js partner dashboard and a Next.js admin back office, all on one NestJS API.

## 2026-11-14: Two booking flows

Instant booking for tables, and request-for-quote for events. Both are in the data model from the start.
