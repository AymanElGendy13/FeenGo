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
- Every change reaches `main` through a pull request, after tests pass and the reviewer subagent approves. Who merges depends on the kind of change:

  | Kind of pull request | Who merges |
  | --- | --- |
  | Documents (`docs/**`, `CLAUDE.md`, `.claude/**`); any decision; the API contract; any migration or data-model change; any dependency change (an edit to dependency fields in `package.json` or `pubspec.yaml`, or to `pnpm-lock.yaml` or `pubspec.lock`); sign-in and security code (see below); anything under `.github/**` or anything else that decides which checks run; anything released to testers or stores | The owner |
  | A build increment that only implements what is already approved and falls under no row above | The main Claude session, when every auto-merge condition below holds |

  Sign-in and security code means: the API's auth module, guards and role checks, token signing and refresh, one-time code sending and limits, rate limiting, log redaction, cookie and session handling in both dashboards, and secure storage in the app. In S1 nearly every pull request is sign-in code, so nearly every S1 pull request goes to the owner.

  Auto-merge conditions, all required: CI is green, and branch protection on `main` requires it and is enforced for administrators; the reviewer subagent approves with no open findings and marks the pull request "auto-merge eligible"; qa-tester passes; and the pull request falls under no row the owner merges. The main session merges with the GitHub merge tool only, never overrides a failing check, never bypasses branch protection, and posts a short summary on the pull request for the owner. If any condition fails, or there is any doubt, the pull request waits for the owner. No subagent merges. The owner can revert any auto-merged pull request.

  Auto-merge starts only after CI exists (S0 increment C3) and the owner has turned on required status checks for `main`, enforced for administrators. Until then, the owner merges everything.
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

- Start local services: `docker compose up -d`
- Backend: `cd apps/api && npm run start:dev`
- Mobile: `cd apps/mobile && flutter run`
- Dashboards: `cd apps/partner-web && npm run dev`, `cd apps/admin-web && npm run dev`
