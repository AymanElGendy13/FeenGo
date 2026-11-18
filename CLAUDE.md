# FeenGo

Marketplace app for Egypt: people find restaurants, cafes and venues, book tables, and request events such as birthdays and engagements. Arabic first, English second.

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
- `docs/`: project documents
- `.claude/agents/`: subagent definitions

## How we work

- Work only on the current slice in `docs/ROADMAP.md`. Do not build ahead.
- Plan before editing. For anything bigger than a small fix, present a plan and wait for approval.
- Work on a branch named `<slice>/<requirement-id>-<short-name>`, for example `s1/c-02-otp-login`. Never commit to `main`.
- Every change reaches `main` through a pull request, after tests pass, the reviewer subagent approves, and the owner approves.
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
