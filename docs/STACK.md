# FeenGo tech stack and security baseline

The stack was confirmed on 18 November 2026. Changing any line here needs an entry in `docs/DECISIONS.md`.

## Stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Mobile app | Flutter | One codebase for iPhone and Android. Arabic and right-to-left support from the first screen. |
| Backend | NestJS, TypeScript | One well-structured backend with clear modules, split into services only when load requires it |
| Database | PostgreSQL with PostGIS | PostGIS for "venues near me" |
| Cache and queues | Redis | Slot holds, rate limits and background jobs |
| Partner and admin dashboards | Next.js, TypeScript | Two separate apps, one shared component library |
| Payments | Paymob | Cards, Egyptian wallets, Apple Pay and Google Pay. Bookings are real-world services, so store in-app purchase is not used. |
| One-time codes | WhatsApp, with SMS fallback | Behind one interface so the provider can change |
| Push, analytics, crash reports | Firebase | |
| Maps | Google Maps | |
| Hosting | AWS, Docker containers | Development, staging and production environments |
| Build pipeline | GitHub Actions, Fastlane | Fastlane handles store uploads |
| Testing | Flutter tests, Maestro or Appium, Playwright, Jest, k6 | |

## Architecture rules

- **Stateless backend.** No session lives on a server, so adding servers is a configuration change.
- **Module boundaries.** Auth, venues, availability, bookings, events, payments, notifications, settings and admin are separate modules. A module uses another only through its public service, never its tables.
- **Contract first.** `docs/api/openapi.yaml` changes before the code that uses it.
- **Settings, not constants.** Every rule in the PRD's changeable rules section is read from the settings store (R-01).
- **Bookings keep their rules.** A booking stores a copy of the policy it was made under (R-03).
- **Safe retries.** Booking and payment requests carry an idempotency key, so a request sent twice is processed once.
- **Slot locking.** Two customers can never both get the last slot (C-10), including under load.
- **Location data on every record.** City, country and currency are stored on venues and bookings, so new cities are data, not code.
- **Bilingual data.** Every user-facing text field in the database has Arabic and English values.

## Security baseline

- **Login.** One-time codes expire quickly and are rate-limited per phone number and per device.
- **Sessions.** Short-lived access tokens with refresh tokens, stored in the phone's secure storage, never in plain files.
- **Roles.** Customer, venue owner, venue staff and admin each see only their own data. The backend enforces this on every request.
- **Payments.** Card details are never stored. Every Paymob notification is verified before it is trusted.
- **Secrets.** Keys and passwords live in a secrets manager or environment variables, never in code or commits.
- **Encryption.** All traffic uses HTTPS. The database and backups are encrypted at rest.
- **Admin actions.** Every approval, refund and edit in the back office is logged and cannot be edited (A-11).
- **Input.** Every request body is validated against the API contract.
- **Dependencies.** The pipeline scans libraries for known vulnerabilities.

## Personal data

- Collect only what a booking needs.
- Account deletion works inside the app (C-04).
- The privacy policy follows Egypt's Personal Data Protection Law, to be confirmed by a lawyer.
- Apple's privacy labels and Google's Data Safety form are filled in from the same list of collected data.

## Testing and release gates

No change is merged unless all of these pass:

- Unit tests for business rules, such as slot holds, cancellation windows and deposits.
- API tests against the contract.
- End-to-end tests of the slice's main journeys on the app and the dashboards.
- A review by the reviewer agent, then the owner's approval.

Before the first public release, add a load test at 10 times expected launch traffic and a full manual pass in Arabic and English on real phones.
