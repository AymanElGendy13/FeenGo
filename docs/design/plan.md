**Draft: needs owner approval**

# FeenGo design plan and timeline

Design runs as its own track, ahead of the build. Brand and visual decisions can take as long as the owner needs, and the build still never waits for them. This works because every screen is approved in two layers:

| Layer | What it covers | What it unblocks | Can change later? |
| --- | --- | --- | --- |
| **Build approval** | Structure: what is on the screen, in what order, every state, every text in both languages, right-to-left behaviour, interactions, accessibility. Drawn as wireframes or with the provisional tokens. | Feature code for that screen | Only through a new decision, because it changes code |
| **Visual approval** | Look: colour, type, radius, shadows, icons, imagery, logo, motion details | Applied through `packages/design-tokens` and shared components | Yes. A token or component change restyles every screen at once. |

Build approval gates each slice's build. Visual approval gates the first public release, after S6, when store screenshots and listings are made.

This split changes three statements in `docs/ROADMAP.md`. They are quoted, with what each would become, in section 6, decision 1. Until the owner approves that decision, the ROADMAP wording stands and this plan is only a proposal.

The brand inputs (personality, directions, logo brief, typography, palette review) are in `docs/design/brief.md`.

---

## 1. Phases

Phases 1 to 4 form the **brand track**. Phases 5 and 6 form the **product track**. The two run in parallel, and the product track does not depend on the brand track.

| Phase | Work | The owner decides | The owner approves | Indicative length |
| --- | --- | --- | --- | --- |
| 1. Brand discovery | Answer the personality questions, mark the reference apps, confirm the Arabic name, voice and digits | Personality attributes, Arabic voice, Arabic name (provisional is fine), digit style | `brief.md` sections 1 to 3 | 1 to 2 weeks |
| 2. Visual direction | Mood boards for A, B and C, each shown on the same three sample screens (home, venue page, partner bookings inbox) in English and Arabic, light and dark | One direction as the base | A recorded direction choice in `docs/DECISIONS.md` | 2 to 3 weeks |
| 3. Logo and icon | The designer works from `brief.md` section 5. Two or three concepts, then refinement, then a trademark search. | Designer, concept, Arabic wordmark | Final logo, icon set and usage guide | 3 to 6 weeks, often outside the team |
| 4. Design system | Final palette with light and dark roles, type scale per script, spacing, radius, elevation, motion, and the component library (buttons, fields, chips, cards, sheets, tab bar, status badges, empty and error states) | Palette and typography pairing | Tokens and components, which then replace the provisional tokens in one edit | 3 to 4 weeks after phase 2 |
| 5. Navigation and information architecture | The app's tab bar, the partner dashboard navigation, the admin sidebar, and where every future screen lives | Tab items, and whether events get their own entry point | The navigation proposal in section 3 | 1 to 2 weeks, starting now |
| 6. Per-slice screens | Draft specs and wireframes, one slice ahead of building, then visual designs once phase 4 is done | Per screen: content, flows, copy | Build approval per slice, visual approval later | Ongoing |

### Timeline at a glance

Week 0 is the owner's approval of this plan. The lengths are indicative and follow the owner's pace.

```
Week:              0    2    4    6    8    10   12   14   16
Brand track
  1 Discovery      ####
  2 Direction          ######
  3 Logo and icon            ############
  4 Design system            ########
Product track
  5 Navigation     ####
  6 S1 screens     ######                  (S1 build can start at about week 2)
  6 S2 screens           ######            (while S1 is built)
  6 S3 screens                 ######      (while S2 is built)
  ...one slice ahead from then on
```

Phase 4 starts after phase 2. It can then run alongside phase 3, because the logo needs the palette and the palette should respect the logo. The two are finalised together.

---

## 2. Screen inventory, S1 to S7

The count is an estimate of distinct screens. Sheets and dialogs that need their own spec count as screens. Simple states of a screen (loading, empty, error) are part of that screen's spec. Screen names are working names. Each becomes a spec file such as `docs/design/s1/otp-entry.md`.

### S1 Sign-in: about 17 screens (app 11, admin 6)

| Product | Screen | Requirement IDs |
| --- | --- | --- |
| App | Phone number entry, with "continue without an account" | C-02, C-01 |
| App | One-time code entry: resend, WhatsApp-to-SMS fallback, expiry, wrong code, lockout | C-02 |
| App | Complete your profile (name, optional email) after first sign-up | C-04 |
| App | Sign-in prompt sheet, shown when a visitor tries a signed-in action, returning them to the same place | C-01 |
| App | Account (tab or screen): profile summary, settings, legal links, sign out | C-04, C-03 |
| App | Edit profile | C-04 |
| App | Language setting | C-03 |
| App | Appearance setting (system, light, dark), only if the owner wants an in-app control (section 6, decision 3) | No PRD ID, owner to confirm |
| App | Delete account: explanation and confirmation | C-04, Q-07 |
| App | Account deleted | C-04, Q-07 |
| App | Legal pages: terms and privacy policy | No PRD ID. `docs/STACK.md`, "Personal data" |
| Admin | Admin sign-in | A-01 |
| Admin | Second sign-in step (code entry) | A-01 |
| Admin | Second-step setup on first sign-in | A-01 |
| Admin | Admin shell: empty home with the sidebar | A-01 |
| Admin | Activity log: list with filters | A-11 |
| Admin | Activity log entry detail | A-11 |

### S2 Venue onboarding: about 23 screens (dashboard 14, admin 9)

| Product | Screen | Requirement IDs |
| --- | --- | --- |
| Dashboard | Partner sign-in (method to be chosen by the architect) | P-01 |
| Dashboard | Create a venue account | P-01 |
| Dashboard | Business details | P-01 |
| Dashboard | Upload documents (commercial registration, tax card) | P-01 |
| Dashboard | Partner agreement: read and accept | P-01, A-09 |
| Dashboard | Application submitted | P-01, P-02 |
| Dashboard | Approval status: Pending, Approved, or Rejected with a reason | P-02 |
| Dashboard | Fix and resubmit | P-02 |
| Dashboard | Venue profile overview, with its completeness | P-03 |
| Dashboard | Photos manager | P-03 |
| Dashboard | Description, categories, accepted occasions, capacity | P-03 |
| Dashboard | Menu manager | P-03 |
| Dashboard | Opening hours and location (map picker) | P-03 |
| Dashboard | New agreement version: accept prompt | A-09 |
| Admin | Venue approval queue | A-02 |
| Admin | Application review: documents viewer, approve, reject with a reason | A-02 |
| Admin | Venues: search and list | A-03 |
| Admin | Venue detail: suspend and restore | A-03 |
| Admin | Customers: search and list | A-03 |
| Admin | Customer detail: suspend and restore | A-03 |
| Admin | Lists manager: categories, occasions, cuisines, areas | A-05 |
| Admin | List item editor, in Arabic and English side by side | A-05 |
| Admin | Agreement versions: list and publish | A-09 |

### S3 Discovery: about 16 screens (app 14, admin 2)

| Product | Screen | Requirement IDs |
| --- | --- | --- |
| App | Home: categories, occasions, featured, near you | C-05 |
| App | Location explainer before the permission prompt, plus an area picker when permission is denied | C-05 |
| App | Search: input, recent searches, suggestions. **Proposal for the owner, beyond C-06:** also match Franco-Arabic spellings. | C-06 |
| App | Results list | C-06 |
| App | Results map | C-06 |
| App | Filters sheet: area, category, cuisine, price, occasion, open now | C-06 |
| App | Category or occasion results (reuses the results list) | C-05 |
| App | Venue page | C-07, C-01 |
| App | Photo gallery | C-07 |
| App | Menu viewer | C-07 |
| App | Reviews list (read-only, empty until S7) | C-07 |
| App | Cancellation policy explainer sheet | C-07 |
| App | Hours and location detail, with a link out for directions | C-07 |
| App | Share. **Proposal for the owner, beyond C-08:** a small web fallback page for shared links when the app is not installed, instead of sending people straight to the store. | C-08 |
| Admin | Featured venues: list and schedule | A-06 |
| Admin | Featured slot editor: venue, start and end dates | A-06 |

### S4 Table booking: about 30 screens (app 12, dashboard 13, admin 5), plus message templates

| Product | Screen | Requirement IDs |
| --- | --- | --- |
| App | Booking sheet: date, time slots, party size | C-09 |
| App | Review and confirm: note, policy summary, hold countdown | C-09, C-10, R-03 |
| App | Hold expired | C-10 |
| App | Result: Confirmed or Pending | C-11 |
| App | Deposit required because of the no-show limit (see open question 2 in section 7) | C-13 |
| App | My bookings: upcoming and past, available offline | C-17, Q-03 |
| App | Booking detail with status | C-17, C-11 |
| App | Change booking | C-12 |
| App | Cancel booking: what happens to the deposit, then confirm | C-12 |
| App | Notification permission explainer | C-18 |
| App | Offline banner and "this needs a connection" pattern | Q-03 |
| App | Push notification copy, all types, in both languages | C-18 |
| Dashboard | Today: today's bookings timeline and pending count | P-07 |
| Dashboard | Bookings inbox: pending, upcoming, past | P-07 |
| Dashboard | Booking detail: accept, decline, Attended, No-show | P-07 |
| Dashboard | Decline with a reason | P-07 |
| Dashboard | Add a phone or walk-in booking, or block a slot | P-05 |
| Dashboard | Availability: hours, slot length, capacity per slot | P-04 |
| Dashboard | Blocked dates | P-04 |
| Dashboard | Policies: confirmation mode, cancellation policy per category, deposit levels within admin limits | P-06, R-02 |
| Dashboard | Alerts: WhatsApp and email preferences | P-10 |
| Dashboard | Staff list, with remove | P-11 |
| Dashboard | Invite staff | P-11 |
| Dashboard | Staff invitation accept and first sign-in | P-11 |
| Dashboard | WhatsApp and email alert templates | P-10 |
| Admin | Settings console: grouped list | A-04, R-01 |
| Admin | Setting editor with limits and defaults | A-04, R-01, R-02 |
| Admin | Settings change log | R-04 |
| Admin | Booking categories editor | R-01 |
| Admin | Cancellation policies editor | R-01 |

### S5 Event requests: about 13 screens (app 8, dashboard 5)

| Product | Screen | Requirement IDs |
| --- | --- | --- |
| App | Event request, step by step: occasion, date, guests, budget range, extras, notes, site visit | C-14 |
| App | Review and send request | C-14 |
| App | Request sent | C-14 |
| App | My bookings: event requests alongside tables | C-17, C-14 |
| App | Event request detail with a status timeline | C-14, C-15 |
| App | Quote detail: package, total, deposit, policy, expiry | C-15 |
| App | Compare quotes, when there are several | C-15 |
| App | Accept or decline a quote | C-15 |
| Dashboard | Event requests inbox | P-08 |
| Dashboard | Request detail | P-08 |
| Dashboard | Create quotes, one or more | P-08 |
| Dashboard | Decline with a reason | P-08 |
| Dashboard | Site visit handling | P-08, C-14 |

### S6 Deposits: about 14 screens (app 7, dashboard 3, admin 4), plus store assets

| Product | Screen | Requirement IDs |
| --- | --- | --- |
| App | Deposit summary before paying | C-16, C-13 |
| App | Paymob checkout (FeenGo frames it, Paymob owns the payment form) | C-16 |
| App | Payment in progress | C-16 |
| App | Payment success and receipt | C-16 |
| App | Payment failed, retry | C-16 |
| App | Payments and receipts list | C-16 |
| App | Refund status on booking detail | P-09 |
| Dashboard | Cancel as the venue, with a refund notice | P-09 |
| Dashboard | Payments view: deposits, fees, payouts | P-12 |
| Dashboard | Payment detail | P-12 |
| Admin | Bookings search | A-07 |
| Admin | Booking detail with full history | A-07 |
| Admin | Refund with a reason | A-07 |
| Admin | Change status with a reason | A-07 |
| Store | App Store and Google Play screenshots, Play feature graphic, listing text, in both languages | No PRD ID |

### S7 After the visit: about 10 screens (app 5, dashboard 1, admin 4)

| Product | Screen | Requirement IDs |
| --- | --- | --- |
| App | Review prompt after an Attended or Completed booking | C-19 |
| App | Write a review: stars, optional text | C-19 |
| App | Referral code and share | C-20 |
| App | Help: contact options | C-20 |
| App | Report a problem | C-20 |
| Dashboard | Statistics for a chosen period | P-13 |
| Admin | Reviews moderation list | A-08 |
| Admin | Hide a review with a reason | A-08 |
| Admin | Metrics dashboard | A-10 |
| Admin | Problem reports inbox (see open question 4 in section 7) | C-20 |

### Totals

| Slice | App | Dashboard | Admin | Total |
| --- | --- | --- | --- | --- |
| S1 | 11 | 0 | 6 | 17 |
| S2 | 0 | 14 | 9 | 23 |
| S3 | 14 | 0 | 2 | 16 |
| S4 | 12 | 13 | 5 | 30 |
| S5 | 8 | 5 | 0 | 13 |
| S6 | 7 | 3 | 4 | 14 |
| S7 | 5 | 1 | 4 | 10 |
| **All** | **57** | **36** | **30** | **about 123** |

S4 is the heaviest slice. **Owner question:** allow S4 specs to start during S2, because S4 is about 30 screens? Under the one-slice-ahead rule, S4 design would otherwise start only while S3 is being built.

---

## 3. Proposed navigation (proposal, needs owner approval)

### Customer app: bottom tab bar, four tabs

| Tab | Holds | Arrives in |
| --- | --- | --- |
| Home | Categories, occasions, featured, near you. The entry point to "plan an event". | S3 (placeholder until then) |
| Search | Search, filters, list and map | S3 |
| Bookings | Tables and event requests together, upcoming and past. Visitors see a sign-in prompt. | S4 |
| Account | Profile, language, appearance (if the owner wants it), payments (S6), referral and help (S7), legal, sign out, delete account | S1 |

- The tab bar mirrors in Arabic: Home sits at the far right.
- Search and Bookings appear in the slices that fill them. An empty tab is never shown.
- **S1 and S2: two options for the owner.** Platform guidance puts a tab bar at 3 to 5 destinations, so a bar with only Home and Account is weak.
  - Option 1: no tab bar in S1 and S2. An Account button sits in the end corner of the Home header. The tab bar arrives in S3 with Home, Search and Account, and Bookings joins in S4. **Recommended.**
  - Option 2: a two-tab bar (Home, Account) from S1.
- Events do not get a tab. They start from Home (occasion tiles) and from the venue page. **Owner question:** if events are central to the business, a fifth tab "Events" is the alternative.
- No "Saved" or "Favourites" tab, because the PRD has no such requirement.
- A tab bar is the platform convention on both iOS and Android (Material navigation bar). One shared design is used on both, with platform-specific back gestures and system sheets.

### Partner dashboard: mobile-first website

On phones: a bottom navigation bar with up to five items. On tablets and laptops: the same items in a side rail.

| Item | Holds | Arrives in |
| --- | --- | --- |
| Today | Today's bookings, pending count, and "add booking" as the screen's primary action | S4 |
| Bookings | Pending, upcoming, past | S4 |
| Events | Requests and quotes | S5 |
| Venue | Profile, photos, menu, hours, availability, policies | S2 (profile), S4 (availability, policies) |
| More | Staff, alerts, payments (S6), statistics (S7), agreement, account, language | S2 onward |

- Before S4, the dashboard shows only the approval status and Venue.
- Staff accounts do not see policies or business details (P-11). Those entries are hidden, not disabled.
- **Architect question:** should the dashboard be installable to the home screen as a web app, so staff open it like an app? This affects icons and offline behaviour, but not the navigation.

### Admin back office: sidebar, desktop-first

Home (metrics, S7), Approvals (S2), Venues (S2), Customers (S2), Bookings (S6), Reviews (S7), Featured (S3), Settings (S4), Lists (S2), Agreements (S2), Activity log (S1). The sidebar is on the start side, which is the right in Arabic.

---

## 4. Gates

### What S0 needs (and nothing more)

- Build approval of `docs/design/s0/placeholder-home.md`.
- The provisional tokens from `docs/ROADMAP.md` in `packages/design-tokens`, expressed as the light and dark roles listed in the placeholder spec. This is a small task for ui-ux-designer after approval.
- A temporary app icon and launch screen: the provisional Primary as background with a plain "FG" in white, clearly marked as temporary. It is needed only so builds install on real phones. Different badges per environment (development, staging) are suggested to release-manager.
- Temporary favicons for the two dashboards.

S0 needs no brand decisions, no logo and no navigation approval.

### Build approvals needed before each slice's feature code

| Slice | Must have build approval before code starts |
| --- | --- |
| S1 | App: phone entry, code entry, complete profile, sign-in prompt, account, edit profile, language, appearance (only if section 6, decision 3 is yes), delete account, account deleted, legal pages. Admin: sign-in, second step, second-step setup, shell, activity log, log detail. Also the S1 part of the navigation (where Account lives, section 3) and owner decisions 5 to 7 in section 6 (Arabic digits, voice, provisional Arabic name). |
| S2 | All S2 dashboard and admin screens, and the dashboard and admin navigation |
| S3 | All S3 screens, and the full app navigation (expensive to change after this slice) |
| S4 | All S4 screens and message templates, and the status colour, icon and label set for bookings |
| S5 | All S5 screens, and the event statuses added to the status set |
| S6 | All S6 screens |
| S7 | All S7 screens |
| First public release, after S6 | **Visual approval** of every shipped screen, the final logo and icon set, the final tokens in place, and the store listing assets in both languages |

Each screen is approved in English first, then checked in Arabic, in light and dark.

### What can safely stay provisional until late

These are applied through tokens or assets, so changing them later is cheap.

- Colours, typefaces, the type scale, radius, shadows and spacing values
- The icon set, illustrations, empty-state art and photography style
- The logo, app icon, launch screen and favicons, until the store listing work before the public release
- Motion details: durations and curves
- Copy wording. Translation keys stay the same while their values change.
- The Arabic name, until the public release. Testers can see a provisional one.

These should **not** stay provisional, because changing them means rewriting code:

- Navigation structure (fixed by S3)
- What each screen contains, its states and its flows
- Component behaviour: how sheets, fields, tabs and lists work
- Status names and their meaning (fixed by the PRD)
- Arabic digit style and copy voice (fixed by S1)

---

## 5. Tools and file flow

### Suggested tools

- **Figma** for designs, prototypes and the component library. Use Figma variables for tokens, with light and dark modes and English and Arabic. A paid plan is needed for shared libraries and full version history.
- **Penpot** is an open-source alternative with built-in design tokens. Choose it if avoiding a subscription matters more than plugins and hiring familiarity.
- **Tokens:** export from the design tool as JSON in the Design Tokens Community Group format, which reached a stable version in 2025. ui-ux-designer turns the export into `packages/design-tokens`, which generates the Flutter and web themes. The generator tool is a dependency to agree with the architect.
- **Logo and icon:** the designer's own tool, plus Apple's Icon Composer for the layered iOS icon.

### File flow

1. The owner, or a designer working for the owner, designs in the design tool. Each frame is named `<slice>/<screen-id>/<lang>-<theme>`, for example `s1/otp-entry/en-light`.
2. When a screen is ready, ui-ux-designer writes or updates its spec in `docs/design/<slice>/<screen-id>.md`.
3. The owner approves in the design tool and names the version, for example "S1 build approval 1".
4. Approved frames are exported as PNG at 2x to `docs/design/<slice>/images/<screen-id>_<lang>_<theme>.png`, for example `otp-entry_en_dark.png`. At least English light, English dark, Arabic light and Arabic dark are exported, plus the largest text size for text-heavy screens.
5. The spec header records the approval: layer (build or visual), date, design-tool file link and version name. The status line changes from "Draft: needs owner approval" to "Approved for build" or "Approved visually".
6. Brand-level choices (direction, palette, type, logo, navigation) are recorded in `docs/DECISIONS.md`.
7. Token changes flow from the design-tool export into `packages/design-tokens` in one pull request, never into the apps directly.
8. After the slice is built, ui-ux-designer reviews Flutter golden images and Playwright screenshots against the exported images.

Logo masters and app-icon source files need a home. They do not belong in `docs/`, and builders need the exported assets. The architect proposes where they live, for example a brand-assets package. Many PNG files will also grow the repository. release-manager may want Git LFS for `docs/design/**/images`.

---

## 6. Decisions the owner needs to make first, in order

1. **Confirm the two-layer approval** (build approval now, visual approval before the public release). Everything else depends on it. It changes three statements in `docs/ROADMAP.md`:

   | ROADMAP today | Under the split it becomes |
   | --- | --- |
   | "How design fits": "The design system and the app's main navigation are designed once, at the start." | The app's main navigation is designed at the start and fixed by S3. The design system is designed in phase 4, alongside the build, and replaces the provisional tokens with one edit. It is not needed before building starts. |
   | "How design fits": "A slice's feature code does not start until its screens are approved." | A slice's feature code does not start until its screens have **build approval** (structure, states, copy in both languages, right-to-left, accessibility). Visual approval can come later. |
   | "When a slice is done", step 1: "Its screens are designed and approved in Arabic and English." | Its screens have build approval in English and Arabic, and are built to match. **Visual approval** of all shipped screens is required before the first public release after S6, not for each slice. |

   Only after the owner approves will a `docs/DECISIONS.md` entry and a `docs/ROADMAP.md` edit follow. Until then the ROADMAP wording stands.
2. **Approve the S0 placeholder spec,** and saving the language choice in S0 (the first-launch language was decided on 2026-11-19: always English, DECISIONS.md) (C-03 groundwork brought forward from S1).
3. **In-app appearance control.** Neither the ROADMAP nor the PRD asks for one. S0 follows the phone's light or dark setting only, which still proves both themes. Should the app also offer a System, Light and Dark choice from S1? If yes, it becomes the S1 "Appearance setting" screen, with no PRD ID.
4. **Choose the design tool** (Figma or Penpot), where designs live and who has access.
5. **Arabic digits** in Arabic screens: Western or Arabic-Indic. Needed for S1.
6. **Arabic voice** and gender-neutral copy. Needed for S1.
7. **A provisional Arabic name.** Needed for S1 testers. Final before the public release.
8. **App navigation proposal:** where Account lives in S1 and S2 (header button or two-tab bar), and the events question.
9. **Brand personality:** answers to the questions in `brief.md` section 2.
10. **Visual direction** A, B or C.
11. **Logo:** who designs it, and approval of the logo brief.
12. **Typography pairing.**
13. **Final palette,** which comes in phase 4.

---

## 7. Open questions that affect design

These come from the project documents. None of them blocks S0. Each one needs an answer before the slice named.

1. **Partner sign-in method** (before S2). The PRD does not say how venue owners and staff sign in: phone code, email and password, or both. The architect proposes it, and the owner decides.
2. **No-show deposit before payments exist** (before S4). C-13 is in S4, but paying a deposit (C-16) arrives in S6. In S4, a customer who reached the no-show limit can only be blocked or told a deposit will be needed. The owner decides which, and the S4 screen is designed for that.
3. **Cancelled by venue before S6** (before S4). The status exists from S4, but cancelling as the venue (P-09) is in S6. Can a venue cancel a table booking without a deposit in S4?
4. **Where "report a problem" goes** (before S7). C-20 lets customers report a problem, but no admin or dashboard requirement receives the reports. The inventory assumes an admin inbox.
5. **Reviews on the venue page before S7** (before S3). C-07 shows rating and reviews from S3, but reviews only exist from S7. The venue page hides the rating until a venue has reviews, and shows a short note instead.
6. **Language preference after sign-in** (before S1). C-18 sends notifications in the chosen language, so the language chosen on the phone must also be stored on the account. The architect confirms this in the API.
7. **Installable partner dashboard** (before S2). See section 3.
8. **"Awaiting deposit" before payments exist** (before S5). In S5 a customer can accept a quote, which moves the booking to Awaiting deposit, but paying the deposit (C-16) only arrives in S6. What do testers see at that status in S5, and does it expire after the usual time?
9. **Appearance control** (before S1). See section 6, decision 3.
