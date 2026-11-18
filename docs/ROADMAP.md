# FeenGo roadmap

FeenGo is built and released one feature slice at a time. Each slice is a complete piece a person can use, working across every product it touches. Requirement IDs refer to `docs/PRD.md`.

Within a slice, work is delivered as small, single-feature pull requests. Each feature pull request is reviewed and merged before the next feature starts, so the product grows one working piece at a time. Design specs and documents for the next slice may be prepared alongside.

**Current slice: S0 Foundation**

Update the line above when a slice is finished.

## Slices

| Slice | When it ships, a person can | Requirements | Products touched |
| --- | --- | --- | --- |
| S0 Foundation | Open an empty FeenGo app in Arabic or English, light or dark | Q-02, Q-04, Q-06 | All three |
| S1 Sign-in | Sign up and log in with a phone code, edit their profile, delete their account | C-01 to C-04, A-01, A-11 | App, admin |
| S2 Venue onboarding | A venue signs up, uploads documents and accepts the agreement, and admin approves it | P-01 to P-03, A-02, A-03, A-05, A-09 | Dashboard, admin |
| S3 Discovery | Browse the home screen, search, filter, use the map, open and share a venue page | C-05 to C-08, A-06 | App, admin |
| S4 Table booking | Book, change and cancel a table, while the venue sets availability and handles bookings | R-01 to R-04, A-04, P-04 to P-07, P-10, P-11, C-09 to C-13, C-17, C-18 | All three |
| S5 Event requests | Request an event, then receive and accept quotes | C-14, C-15, P-08 | App, dashboard |
| S6 Deposits | Pay a deposit, get refunded when a venue cancels, see payments | C-16, P-09, P-12, A-07 | All three |
| S7 After the visit | Review a visit, share a referral code, get help, see statistics | C-19, C-20, P-13, A-08, A-10 | All three |

The quality requirements (Q-01 to Q-07) apply to every slice. Venue onboarding comes before discovery because discovery needs approved venues to show. Development and staging use sample venues until real ones join.

## S0 Foundation in detail

S0 builds no features. It builds the base every slice stands on.

- Repository layout as described in `CLAUDE.md`.
- Flutter app shell: app name FeenGo, light and dark themes from the design tokens below, Arabic and English with right-to-left layout, a language switch, and one placeholder home screen.
- NestJS API with a health-check endpoint, configuration from environment variables, structured logging, and a database connection.
- PostgreSQL and Redis, running locally through Docker Compose.
- The partner dashboard and the admin back office as empty Next.js apps with the same tokens, in Arabic and English.
- Database migrations set up, with the first migration creating the settings table that R-01 needs later.
- Analytics wiring with a single test event (Q-06).
- GitHub Actions pipeline that installs, lints, tests and builds all four apps on every push and pull request.
- `docs/ARCHITECTURE.md` and the first version of `docs/api/openapi.yaml`, written and approved before the code.

Done when a change pushed to a branch builds and tests itself automatically, and the empty app runs on a real iPhone and Android phone in both languages.

### Provisional design tokens

These come from the brand direction and will be replaced by the design system once it is approved. They live in `packages/design-tokens`, owned by ui-ux-designer, and all three products generate their themes from there, so a change is a single edit.

| Role | Hex |
| --- | --- |
| Primary | #B3204F |
| Accent | #F2A93B |
| Success | #0E6B5E |
| Dark neutral | #1C2430 |
| Light neutral | #FBF6EE |

Typeface: IBM Plex Sans Arabic for Arabic and English.

## When a slice is done

1. Its screens are designed and approved in Arabic and English.
2. It works in every product it touches.
3. Tests pass for all of its acceptance checks.
4. The reviewer agent has checked every pull request in it, and each was merged under the rule in `CLAUDE.md`.
5. It is released to testers through TestFlight and Google Play internal testing, and the dashboards are deployed to staging (from S1, once the host is chosen).
6. The owner has used it on a real phone.

## What shipping a slice means

Each slice ships to the owner and testers, not to the public stores. Apple rejects apps that do too little. The first public release comes after S6, when a person can find a venue, book it and pay a deposit. S7 can follow shortly after.

## How design fits

The design system and the app's main navigation are designed once, at the start. After that, each slice's screens are designed one slice ahead of building. A slice's feature code does not start until its screens are approved. S0 needs no screens beyond the placeholder.
