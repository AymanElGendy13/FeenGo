# FeenGo decisions

A running log of decisions, newest first. Add an entry whenever something significant is decided, so it is not argued again. Each entry says what was decided and why.

## 2026-11-19: Security override for style-dictionary's glob

style-dictionary 5.8.0 reaches `glob` 13.0.7 and `minimatch` 10.2.6 through `@bundled-es-modules/glob`, both with medium advisories (GHSA-3g3m-2fjr-6pw4, GHSA-g3hv-75wg-m249) that fail CI's dependency scan, and no fixed version exists in the ranges it asks for. A scoped pnpm override pins `glob` to 14.0.6 under `@bundled-es-modules/glob` only, which also brings `minimatch` 11. It adds no new package, the token outputs are byte-identical, and the scan stays as strict as before. It is removed once `@bundled-es-modules/glob` depends on a fixed glob, or style-dictionary stops using it. Decided by the owner (ARCHITECTURE question 23).

## 2026-11-18: Vitest instead of Jest

The API, website and contract tests use Vitest, not the Jest that `docs/STACK.md` listed. NestJS 12's own project template uses ES modules and Vitest, and Jest needs its experimental ES module mode to run NestJS 12; Vitest's test syntax is almost the same as Jest's. The exact versions are in `docs/ARCHITECTURE.md` section 18. Replaces Jest in the Testing row of `docs/STACK.md`. Decided by the owner.

## 2026-11-18: Node 26 through the session hook, nvm and setup-node

Node 26.13.1 reaches every environment without changing `package.json`. In cloud sessions, `.claude/hooks/session-start.sh` installs Node 26.13.1 from nodejs.org, checks its SHA-256 checksum, caches the unpacked Node for later sessions and writes PATH to `$CLAUDE_ENV_FILE`, so it applies to the whole session. Developer machines run `nvm use`, which reads `.nvmrc`. CI uses `actions/setup-node` with `node-version-file: .nvmrc`. The Docker images pin Node themselves. The cloud container has Node 22, and pnpm's own Node download (`devEngines.runtime`) failed there because it also fetches checksums from a host the cloud network refuses, so this fixes the one environment that lacks Node 26 with tools that already work everywhere else. Release-manager writes the hook change; it is merged under the rule in `CLAUDE.md`. Decided by the owner.

## 2026-11-18: Add @eslint/js

`@eslint/js` 10.0.1 is added to the root dev dependencies, and `eslint.config.mjs` turns on `js.configs.recommended` before typescript-eslint's recommended rules. Until now only typescript-eslint's rules ran, so ESLint's own core checks (such as `no-const-assign` and `no-debugger`) were off. Since ESLint 10 the package is released separately from `eslint`; 10.0.1 is the newest 10.x and its peer range covers ESLint 10.15.0. Release-manager adds it in a small root-tooling pull request. Decided by the owner.

## 2026-11-18: The main Claude session merges pull requests

Replaces "Two-tier merging" below. The owner made the main Claude session responsible for merging every pull request, once the reviewer approves with no open findings, tests pass (and, from C3, CI is green), and the pull request records no decision or answer the owner has not given. Releases to testers or stores, store submission, and any pull request that removes or weakens a test, a CI check or branch protection stay with the owner, and no subagent merges. The main session posts a summary on each merged pull request and tells the owner, who can revert any merge. Reason: the owner wants work to flow without waiting on them for every merge, while keeping every product, cost and legal decision in their own hands. The exact rule is in `CLAUDE.md`. Decided by the owner.

## 2026-11-18: Two-tier merging (replaced by the entry above)

The owner merges documents, decisions, the API contract, migrations and data-model changes, any dependency change, sign-in and security code, anything under `.github/**` or that decides which CI checks run, and anything released to testers or stores. The main Claude session merges plain build increments that only implement what is already approved and fall under none of those, once CI is green and required on `main` (enforced for administrators), the reviewer approves with no open findings and marks the pull request auto-merge eligible, and qa-tester passes. It then posts a summary for the owner. The exact rule is in `CLAUDE.md`. All agents act through the owner's GitHub account, so no agent's approval is an independent check; only one actor merges, so it can be held to the conditions. This keeps the owner on every decision without making them the bottleneck for each small build step. Auto-merge starts after CI exists (C3) and the owner has turned on required status checks for `main`, enforced for administrators. Decided by the owner; the inclusion of all `.github/**` changes in the owner's list was added in review and is confirmed by the owner merging this entry.

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
