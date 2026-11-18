# FeenGo

Marketplace app for Egypt: people find restaurants, cafes and venues, book tables, and request events such as birthdays and engagements. English first, Arabic second. Arabic is a full second language, laid out right to left.

## Read before working

- `docs/ROADMAP.md`: slices, the current slice, and what "done" means
- `docs/PRD.md`: requirements, each with an ID and acceptance check
- `docs/STACK.md`: stack, architecture rules, security baseline, release gates
- `docs/DECISIONS.md`: decisions already made; do not reopen them without asking
- `docs/ARCHITECTURE.md` and `docs/api/openapi.yaml`: once they exist

## Layout

- `apps/mobile`: Flutter customer app
- `apps/api`: NestJS backend
- `apps/partner-web`: Next.js venue dashboard
- `apps/admin-web`: Next.js admin back office
- `packages/design-tokens`: the one source of colors, type and spacing for all three products
- `docs/`: project documents, including `docs/design/` screen specs and `docs/testing/` test plans
- `.claude/agents/`: subagent definitions

## Subagents and what they own

| Subagent | Owns | Use it for |
| --- | --- | --- |
| architect | `docs/ARCHITECTURE.md`, `docs/api/`, technical decisions | Data model, API contract, library choices, cross-app changes |
| ui-ux-designer | `packages/design-tokens`, `docs/design/` | Screen specs before building, design review after |
| mobile-dev | `apps/mobile` | The Flutter customer app |
| web-dev | `apps/partner-web`, `apps/admin-web` | The venue dashboard and admin back office websites |
| backend-dev | `apps/api` | Endpoints, business rules, database, integrations |
| qa-tester | End-to-end and API tests, `docs/testing/` | Test plans, missing tests, full runs, bug reports |
| reviewer | Nothing; read-only | Review of every change before a pull request |
| release-manager | `.github/`, Docker, Fastlane, `store/` | Pipeline, environments, tester releases, store preparation |

Each feature in a slice goes through architect, then ui-ux-designer, then builders, then qa-tester, then reviewer, as its own small pull request. Builders may work on the same feature in parallel, each in their own folders.

## How we work

- Before every task, run `git fetch origin` and bring your branch up to date with `origin/main`: fast-forward it, or merge `origin/main` if the branch has its own commits. Never rebase a branch that has been pushed. Never work from a stale checkout. Cloud sessions do this automatically at start through `.claude/hooks/session-start.sh`.
- Work only on the current slice in `docs/ROADMAP.md`. Do not build ahead.
- Deliver work as small, single-feature pull requests. Each feature pull request is reviewed and merged before the next one starts. Design specs and documents for the next slice may be prepared alongside.
- Plan before editing. For anything bigger than a small fix, present a plan and wait for approval.
- Work on a branch named `<slice>/<requirement-id>-<short-name>`, for example `s1/c-02-otp-login`. Never commit to `main`.
- Every change reaches `main` through a pull request, after tests pass and the reviewer subagent approves. The main Claude session merges it, with the GitHub merge tool, when all of these hold:
  - the reviewer subagent approves with no open findings;
  - all tests pass, and once CI exists (S0 increment C3) every CI check on the pull request is green;
  - the pull request records no decision and answers no question that the owner has not given in their own words (in the conversation or on GitHub). A proposal stays a proposal until the owner answers it.

  The main session never merges while a check is failing or, from C3, while a required check has not run; never bypasses branch protection; never merges a pull request that removes or weakens a test, a CI check or branch protection, which waits for the owner; and never merges anything that releases to testers or stores, or submits to a store, which stays with the owner. After each merge it posts a short summary on the pull request and tells the owner. If there is any doubt, the pull request waits for the owner. No subagent merges. The owner can revert any merge.
- Change `docs/api/openapi.yaml` before the code that uses it.
- Each folder under `apps/` has one owning subagent. Two subagents never edit the same files at the same time.
- Record every significant decision in `docs/DECISIONS.md`.

## Rules

- Never hard-code a booking, cancellation, deposit or fee rule. Read it from the settings store (R-01).
- All user-facing text exists in Arabic and English, in translation files, never inline. Layouts must work right to left.
- Never put keys, passwords or tokens in code or commits. Use environment variables, and keep `.env.example` up to date.
- Never store card data. Payments go through Paymob only.
- Every endpoint checks the caller's role and ownership of the data.
- Ask before adding a dependency, changing the data model, or changing the stack.
- Name tests after the requirement they prove, for example `C-02 locks sign-in after five wrong codes`.

## Commands

Keep this section updated as the project grows.

- Requirements: Node 26.13.1 (`nvm use` reads `.nvmrc`; cloud sessions get it from the session-start hook). pnpm comes from `packageManager`: any pnpm 10 or later switches to 12.21.0 by itself.
- Install: `pnpm install` at the root
- Lint and format: `pnpm lint`, `pnpm format:check` (`pnpm format` to fix)
- Start local services: `cp .env.example .env` once, then `docker compose up -d`. Stop: `docker compose down`. Reset the database: `docker compose down -v`
- Backend: `pnpm --filter @feengo/api start:dev`. Checks: `pnpm --filter @feengo/api lint`, `typecheck`, `test` (the tests need the local services running)
- Database: `pnpm --filter @feengo/api db:migrate` (latest), `db:migrate:down-all` (local and test only), `db:types` (regenerates `apps/api/src/database/schema.generated.ts`; export `DATABASE_MIGRATOR_URL` first). Commit the regenerated types; CI fails if they are stale
- Mobile: `cd apps/mobile && flutter run`
- Dashboards: `cd apps/partner-web && npm run dev`, `cd apps/admin-web && npm run dev`
