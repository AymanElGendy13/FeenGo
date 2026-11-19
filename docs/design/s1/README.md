**Draft: needs owner approval**

# S1 Sign-in: screen specs

S1 lets a person sign up and sign in with a phone code, edit their profile, choose their language and delete their account in the app. It also lets the FeenGo team sign in to the back office with a password and an authenticator code, and read the activity log. Requirement IDs refer to `docs/PRD.md`.

These specs are drafts. Feature code for a screen does not start until its spec is approved (`docs/ROADMAP.md`, "How design fits"). What "approved" means here, build approval or full approval, waits on plan decision 1.

Sources: `docs/PRD.md`, `docs/ROADMAP.md`, `docs/design/plan.md`, `docs/design/brief.md`, `docs/design/s0/placeholder-home.md`, `docs/ARCHITECTURE.md` sections 7 to 10 and 14, and `docs/api/openapi.yaml` (version 0.1.0).

## How decisions are named

| Name | Where it is | Examples |
| --- | --- | --- |
| Plan decision N | `docs/design/plan.md`, section 6 | 1 build versus visual approval, 3 appearance setting, 5 Arabic digits, 6 Arabic voice, 7 Arabic name, 8 navigation |
| QN | `docs/ARCHITECTURE.md`, section 22 | Q5 account deletion, Q6 analytics consent, Q7 Egyptian numbers only, Q8 name optional, Q9 admin sign-in, Q11 domain, Q15 `GET /v1/admin/me`, Q18 code rules as settings, Q19 C-01 partly in S1, Q20 internal or external testers |
| S1-QN | Raised by these specs, listed below | S1-Q1 sign-in at first launch |

No spec here answers any of these. Where a screen depends on one, the spec shows the options side by side.

## Screens

Eighteen screens: eleven in the app and seven in the admin back office.

| # | Screen | File | Product | Requirements | Waits on |
| --- | --- | --- | --- | --- | --- |
| 1 | Phone number entry | [phone-entry.md](phone-entry.md) | App | C-02, C-01 | Plan 1, 5, 6, 7. Q7, Q6, Q20. S1-Q1, S1-Q3 |
| 2 | Code entry: resend, SMS fallback, wrong code, expired, locked, delivery failed | [otp-entry.md](otp-entry.md) | App | C-02, C-04 (confirming before deletion) | Plan 1, 5, 6, 7. Q18, Q20 |
| 3 | Complete your profile (name prompt after first sign-up) | [complete-profile.md](complete-profile.md) | App | C-04 | Plan 1, 6. Q8. S1-Q2 |
| 4 | Sign-in prompt sheet: "sign in to continue", returning to the same place | [sign-in-prompt.md](sign-in-prompt.md) | App | C-01 (S1 part) | Plan 1, 6. Q19 |
| 5 | Account | [account.md](account.md) | App | C-04, C-03 | Plan 1, 3, 5, 6, 8 |
| 6 | Edit profile | [edit-profile.md](edit-profile.md) | App | C-04 | Plan 1, 5, 6. Q8. S1-Q2 |
| 7 | Language setting | [language-setting.md](language-setting.md) | App | C-03 | Plan 1, 6 |
| 8 | Appearance setting, only if plan decision 3 is yes | [appearance-setting.md](appearance-setting.md) | App | No PRD ID (Q-04 supports it) | Plan 1, 3, 6 |
| 9 | Delete account: explanation, confirmation, confirming it is you | [delete-account.md](delete-account.md) | App | C-04, Q-07 | Plan 1, 5, 6. Q5 |
| 10 | Account deleted | [account-deleted.md](account-deleted.md) | App | C-04, Q-07 | Plan 1, 6. Q5 |
| 11 | Legal pages: terms of use and privacy policy | [legal-pages.md](legal-pages.md) | App | No PRD ID. `docs/STACK.md`, "Personal data" | Plan 1, 6. Q11. S1-Q3 |
| 12 | Admin sign-in: email and password | [admin-sign-in.md](admin-sign-in.md) | Admin | A-01 | Plan 1, 5, 6. Q9 |
| 13 | Admin authenticator code | [admin-authenticator-code.md](admin-authenticator-code.md) | Admin | A-01 | Plan 1, 5, 6. Q9 |
| 14 | Admin sign-in locked | [admin-sign-in-locked.md](admin-sign-in-locked.md) | Admin | A-01 | Plan 1, 5, 6. Q9 |
| 15 | Admin signed out and session ended | [admin-signed-out.md](admin-signed-out.md) | Admin | A-01 | Plan 1, 6. Q9 |
| 16 | Admin shell: header, sidebar and empty home | [admin-shell.md](admin-shell.md) | Admin | A-01 | Plan 1, 6, 7. Q15 |
| 17 | Activity log: list with filters | [admin-activity-log.md](admin-activity-log.md) | Admin | A-11 | Plan 1, 5, 6 |
| 18 | Activity log entry detail | [admin-activity-log-entry.md](admin-activity-log-entry.md) | Admin | A-11 | Plan 1, 5, 6 |

Every screen waits on plan decision 1 (what approval means) and plan decision 6 (Arabic voice), because every screen has Arabic copy.

### Not specified: first-time authenticator setup

`docs/design/plan.md` lists "Second-step setup on first sign-in" for the back office. The architecture has no such step: `admin:create` prints the authenticator link and secret once, in a terminal, and every admin row is created with a secret (`docs/ARCHITECTURE.md` section 9.2, `admin_users.totp_secret_ciphertext` is not null). No endpoint enrols an authenticator. So there is no setup screen in S1. If the owner wants enrolment in the browser instead, the architect changes the contract first and this screen is added.

### The S0 placeholder home in S1

The S0 placeholder home keeps its app name and welcome line. Its language control moves to the language setting (screen 7), as the S0 spec says. Where the Account entry appears on it waits on plan decision 8 (see `account.md`).

## Open questions raised by these specs

| ID | Question | Screens | Default if unanswered |
| --- | --- | --- | --- |
| S1-Q1 | Is sign-in offered at first launch, with "Continue without an account"? Or does the app open on Home and ask only when an action needs an account? | Phone entry | The app opens on Home (option A in `phone-entry.md`) |
| S1-Q2 | What is the customer's email used for? The PRD makes it optional (C-04) but gives no purpose. `docs/STACK.md` says "collect only what a booking needs", and the privacy policy must say why it is collected. | Complete profile, edit profile | No helper text explains the purpose |
| S1-Q3 | Does signing in mean accepting the terms of use and privacy policy, shown as a line under the button? Or must the customer tick a box? Is the accepted version recorded? This is a lawyer question too. | Phone entry, legal pages | A line with links, nothing recorded |
| S1-Q4 | Where does a suspended customer (`ACCOUNT_SUSPENDED`, from S2) or a customer with a problem go before the help screen arrives in S7 (C-20)? | Phone entry, code entry | The message names no contact |

## Gap list: PRD, architecture and contract

Gaps found while writing these specs. They are recorded here for the architect and the owner, and not fixed in these specs. Where a spec needs an answer, it says what it assumes.

| # | Gap | Specs affected | For |
| --- | --- | --- | --- |
| G1 | `plan.md` lists "second-step setup on first sign-in" for admins. The architecture enrols the authenticator by a server command, and no endpoint exists for it, so there is no setup screen. | README | Owner, architect |
| G2 | There is no admin password reset. `docs/ARCHITECTURE.md` section 9.2 has `admin:reset-totp`, `admin:unlock` and `admin:disable`, but no command to reset a forgotten password. | Admin sign-in | Architect |
| G3 | What a disabled admin gets at the password step is not defined. `POST /v1/admin/auth/sign-in` declares no `403 ADMIN_DISABLED`; only the second step does. | Admin sign-in, authenticator code | Architect |
| G4 | When `proxy.ts` sends an admin to sign-in, the page is not told why (signed out or session ended), nor where to return. These specs propose `reason` and `from`. | Admin signed out | Architect, web-dev |
| G5 | `TOTP_INVALID`'s `attemptsRemaining` counts tries left on the `mfaToken` (3). The lock counts wrong passwords and codes per email (5). An admin can be told "1 try left" and then be locked, or locked with tries "left". | Authenticator code | Architect |
| G6 | No endpoint lists admins, so the activity log cannot offer an admin picker for `actorAdminId`. These specs filter by clicking a name instead. | Activity log | Architect |
| G7 | No endpoint returns one activity log entry, so an entry cannot be linked to directly. Also, `ActivityLogEntry` leaves out the `ip_address` and `request_id` that the table stores "for security review". | Activity log entry | Architect |
| G8 | For `admin.sign_in_failed` and `admin.locked`, who the actor is (the admin whose email was used, who may not be the person trying) is not defined, so "Who" may mislead. | Activity log | Architect |
| G9 | No endpoint exposes `auth.otp.allowed_country_codes`. If Q7 is answered "more countries", the phone field cannot know which countries to offer. | Phone entry | Architect |
| G10 | When the language on the phone and the account's `language` differ at sign-in, nothing says which wins, or how a failed language update is retried. These specs propose: the phone wins and the app retries. Related to plan section 7, question 6. | Code entry, language setting | Architect |
| G11 | `OtpChallenge` gives only absolute times, and the contract declares no server time header. A phone with a wrong clock shows wrong countdowns. Durations in seconds, or a declared `Date` header, would fix it. | Code entry | Architect |
| G12 | No automatic code autofill method is chosen for Android (SMS User Consent, SMS Retriever, or WhatsApp one-tap). Each needs a library and changes to the message templates. | Code entry | Architect |
| G13 | `FieldError.code` is free text with examples, not an enum, and the mapping from validation to codes is still open (`docs/ARCHITECTURE.md` section 4.7). Clients cannot be sure every field error has a translation. | Complete profile, edit profile, admin sign-in | Architect |
| G14 | A customer cannot change their phone number (not in C-04 or the contract). A new number means deleting the account and starting again. | Edit profile | Owner |
| G15 | The email's purpose is not stated (S1-Q2), and it is not verified in S1. | Complete profile, edit profile | Owner |
| G16 | A-09 mentions versions of "the terms", but no requirement says customers accept terms, nothing records it in S1, and the architecture does not say where the legal pages live (S1-Q3). | Phone entry, legal pages | Owner, lawyer, architect |
| G17 | Confirming before deletion uses the normal code check, which starts a second session on the same phone. If the person then cancels, the first session stays open until it expires. | Delete account | Architect |
| G18 | `docs/ARCHITECTURE.md` section 23 tests C-01 by "opening the profile". Account must stay open to visitors for the language setting (C-03), so in these specs the protected S1 screens are edit profile and delete account. The C-01 test should name them. Q19 covers the rest. | Sign-in prompt, account | Architect, qa-tester |
| G19 | If a lawyer says analytics needs consent (Q6), S1 needs a consent screen that is not in the inventory. | Phone entry | Owner, lawyer |

## Shared patterns

Every screen uses these. Each spec refers to them by name rather than repeating them.

### Digits (plan decision 5)

The contract accepts only Western digits: the code pattern is `^[0-9]{6}$` and phone numbers are E.164. Whatever the owner decides, **every number field accepts both digit sets from the keyboard and converts them to Western digits before sending.** Spaces, dashes and brackets are removed.

What is shown on Arabic screens depends on the decision:

| Shown in Arabic screens | Option A: Western digits | Option B: Arabic-Indic digits |
| --- | --- | --- |
| Phone number | +20 10 1234 5678 | ‎+٢٠ ١٠ ١٢٣٤ ٥٦٧٨ |
| Code boxes | 4 9 3 0 2 7 | ٤ ٩ ٣ ٠ ٢ ٧ |
| Resend countdown | 0:42 | ٠:٤٢ |
| Tries left, minutes | 3, 15 | ٣، ١٥ |
| Admin log times | 14:05, 19/11/2026 | ١٤:٠٥، ١٩/١١/٢٠٢٦ |
| Matches the WhatsApp or SMS message? | Yes, if the message uses Western digits | Only if the Arabic message template uses Arabic-Indic digits too |
| Fonts | Plex Sans Arabic has equal-width Western digits | Plex Sans Arabic's Arabic-Indic digits are not equal width, so code boxes and countdowns need fixed-width cells (`brief.md` section 6) |

`docs/design/brief.md` section 6 recommends option A. English screens always use Western digits. The Arabic copy in these specs is written with Western digits as placeholders. Numbers are always formatted by the platform's number formatter with the chosen digit set, never typed into translation strings.

### Arabic voice (plan decision 6)

The Arabic copy in every spec is written in **simple Modern Standard Arabic** only so that there is something concrete to review. It is not a choice. All of it needs owner review. A few strings in both voices, for comparison:

| English | Modern Standard Arabic (as drafted) | Egyptian Arabic (alternative) |
| --- | --- | --- |
| Send code | إرسال الرمز | إرسال الكود |
| That code isn't right. | الرمز غير صحيح. | الكود مش صح. |
| We couldn't send the code. | تعذّر إرسال الرمز. | ماقدرناش نبعت الكود. |
| Resend code in 0:42 | إعادة إرسال الرمز بعد 0:42 | كود جديد بعد 0:42 |
| Sign in to continue | تسجيل الدخول للمتابعة | سجّل دخول عشان تكمّل (gendered: masculine) |

Egyptian Arabic addresses the reader directly, so it is harder to keep gender-neutral: most of its natural phrasings are masculine or feminine. The word for "code" (رمز or كود) also follows this decision, see `docs/design/glossary.md`.

**Gender-neutral rules used in the drafts**, whatever the voice:

- Actions are verbal nouns, not imperatives: "إرسال الرمز", not "أرسل" or "أرسلي".
- Requests use "يُرجى" with a verbal noun: "يُرجى إدخال الرقم".
- Avoid the second-person ending "ـك" (حسابك, هاتفك). Unvoweled it reads either way, but screen readers often pronounce it masculine. Use "الحساب", "رقم الهاتف".
- FeenGo speaks as "we" (أرسلنا, سنرسل), which has no gender.

### App name (plan decision 7)

Every string that names the app uses the key `app.name`. Until the owner decides, its Arabic value is the Latin "FeenGo". The candidate فين جو is in `brief.md` section 5. When "FeenGo" appears inside an Arabic sentence, it is inserted as a left-to-right isolate.

### Phone numbers

- Always shown left to right, as a left-to-right isolate inside any sentence (Unicode LRI and PDI, or Flutter's `Bidi` helpers), so "+20" never jumps to the other end in Arabic.
- Shown in international form, grouped `+20 10 1234 5678`. The grouping is for reading only. The value sent is E.164 `+201012345678`.
- Never truncated. At large text sizes the number wraps only at group spaces.
- Screen readers read the groups. If a screen reader reads a group as one large number, the spoken label inserts spaces between digits.

### Code input (app and admin)

- Shown as six boxes, but it is **one text field** for screen readers, autofill and paste. The boxes are drawing only.
- Always left to right, in both languages: the first digit is in the left box.
- Accepts both digit sets, and pasted text such as "493 027", "493-027" or a whole message that contains exactly one six-digit number.
- When the sixth digit arrives, by typing, paste or autofill, the code is checked at once. There is no submit button to find.
- At large text sizes, when six boxes no longer fit across the column at a minimum of 44 by 44 points each, the boxes become one plain field with wide letter spacing. Nothing is cut off.
- The code is never shown after a wrong try. The field clears and keeps focus.

### Times and durations from the server

No screen states a fixed number of minutes, tries or seconds. They are settings (Q18) or configuration, so the copy reads them from the response:

| Shown | Comes from |
| --- | --- |
| Resend countdown | `resendAvailableAt` in `OtpChallenge` |
| Code expiry | `expiresAt` in `OtpChallenge` |
| Tries left | `attemptsRemaining` with `OTP_INVALID` or `TOTP_INVALID` |
| Lock or wait time | `retryAfterSeconds` (or `Retry-After`) with `OTP_LOCKED`, `OTP_RESEND_TOO_SOON`, `RATE_LIMITED`, `ADMIN_SIGN_IN_LOCKED` |

Countdowns run from when the response arrived, using the gap between the server time and the phone's clock, so a wrong phone clock does not break them (gap G11: the contract does not declare a server time header).

Durations use these keys, with ICU plurals. Arabic has six plural forms.

| Key | English | Arabic (needs owner review) |
| --- | --- | --- |
| `common.duration.seconds` | `{count, plural, one {# second} other {# seconds}}` | `{count, plural, zero {# ثانية} one {ثانية واحدة} two {ثانيتين} few {# ثوانٍ} many {# ثانية} other {# ثانية}}` |
| `common.duration.minutes` | `{count, plural, one {# minute} other {# minutes}}` | `{count, plural, zero {# دقيقة} one {دقيقة واحدة} two {دقيقتين} few {# دقائق} many {# دقيقة} other {# دقيقة}}` |

Waits of 60 seconds or more are rounded up to whole minutes. Countdowns under one hour are shown as `m:ss`, left to right.

### Errors that any screen can get

| Cause | Key | English | Arabic (needs owner review) |
| --- | --- | --- | --- |
| No connection, before or during a call | `common.offline.message` | No internet connection. Check your connection and try again. | لا يوجد اتصال بالإنترنت. يُرجى التحقق من الاتصال والمحاولة مرة أخرى. |
| `503 SERVICE_UNAVAILABLE`, or a timeout | `error.SERVICE_UNAVAILABLE` | FeenGo isn't responding right now. Try again in a moment. | لا يستجيب FeenGo حاليًا. يُرجى المحاولة مرة أخرى بعد قليل. |
| `500 INTERNAL_ERROR` | `error.INTERNAL_ERROR` | Something went wrong on our side. Try again. | حدث خطأ من جهتنا. يُرجى المحاولة مرة أخرى. |
| Shown under `INTERNAL_ERROR`, small and selectable | `common.error.reference` | Reference: {requestId} | المرجع: {requestId} |
| `429 RATE_LIMITED` | `error.RATE_LIMITED` | Too many attempts. Try again in {duration}. | محاولات كثيرة جدًا. يُرجى المحاولة مرة أخرى بعد {duration}. |
| `400 VALIDATION_FAILED` that the screen cannot map to a field | `error.VALIDATION_FAILED` | Something here isn't right. Check it and try again. | توجد بيانات غير صحيحة. يُرجى مراجعتها والمحاولة مرة أخرى. |
| `403 FORBIDDEN` | `error.FORBIDDEN` | This account can't do that. | لا يمكن تنفيذ هذا الإجراء بهذا الحساب. |
| `403 ACCOUNT_SUSPENDED` | `error.ACCOUNT_SUSPENDED` | This account is suspended, so it can't sign in. | هذا الحساب موقوف، لذلك لا يمكن تسجيل الدخول به. |
| A code the app does not know (client fallback, not an API code) | `common.error.unknown` | Something went wrong. Try again. | حدث خطأ ما. يُرجى المحاولة مرة أخرى. |
| Any retry button | `common.action.retry` | Try again | إعادة المحاولة |

`UNAUTHENTICATED` is never shown as a message. The app refreshes once and retries. If the refresh fails with `REFRESH_TOKEN_INVALID`, `REFRESH_TOKEN_REUSED` or `ACCOUNT_SUSPENDED`, the person is signed out, as `sign-in-prompt.md` describes.

Common action keys: `common.action.cancel` (Cancel, إلغاء), `common.action.close` (Close, إغلاق), `common.action.back` (Back, رجوع), `common.action.done` (Done, تم), `common.action.save` (Save, حفظ).

### Loading

- An action that calls the API shows a progress indicator inside its button, keeps the button's size, and disables the button and the fields. The button's spoken label becomes the progress text, for example "Sending code".
- A screen that loads data shows a skeleton of its layout, not a blank screen. If loading takes longer than 10 seconds, the screen shows the `SERVICE_UNAVAILABLE` message with a retry.
- Progress animations stop when reduce motion is on. A static indicator and the progress text remain.

### Messages on screen

- **Field message:** under the field, error colour, with an error icon at the start. Tied to the field for screen readers. Used for errors the person fixes in that field.
- **Inline banner:** at the top of the form, error or information style, with an icon. Used for errors about the whole action. Announced by screen readers when it appears.
- **Snackbar:** for confirmations only, such as "Profile saved". Stays at least 4 seconds, longer with large text. Never the only place an error is shown.

Colour is never the only signal: every error has an icon and words.

## Components needed

S0 built only a segmented control. S1 needs these shared components. Each is built once per product from the tokens, then reused.

| Component | App | Admin | Notes |
| --- | --- | --- | --- |
| Primary button | Yes | Yes | One per screen. Full width in the app. |
| Secondary and text buttons | Yes | Yes | |
| Destructive button | Yes | No | Delete account only |
| Text field with label, helper and error | Yes | Yes | Label always visible above the field, never a placeholder only |
| Phone field | Yes | No | Fixed or selectable country prefix (Q7) |
| Code input | Yes | Yes | See "Code input" above |
| Password field with show and hide | No | Yes | |
| List row: title, value, chevron | Yes | No | Chevron mirrors in Arabic |
| Radio list | Yes | No | Language and appearance |
| Bottom sheet | Yes | No | Sign-in prompt |
| Dialog | Yes | Yes | Confirmations |
| Inline banner | Yes | Yes | Error and information variants |
| Snackbar | Yes | Yes | |
| App bar with back or close | Yes | No | |
| Header, sidebar, skip link | No | Yes | Admin shell |
| Data table that stacks into cards when narrow | No | Yes | Activity log |
| Filter bar, date fields, filter chips | No | Yes | Activity log |
| Side panel | No | Yes | Log entry detail |

## Tokens needed

The S0 tokens have no error colour, no secondary text and no primary button role. These roles are needed before S1 is built. Their values are not chosen here. They come in a separate `packages/design-tokens` pull request, and each must pass the contrast check in light and dark mode.

| Role | Used for | Note |
| --- | --- | --- |
| `primary`, `onPrimary` | Primary buttons | White on #B3204F passes (6.49). In dark mode the S0 `selected` pattern can be reused. |
| `link` | Text links, such as "Change number" and the legal links | #B3204F passes on light (6.03) but fails on dark (2.41). Dark needs a lighter value. |
| `error`, `onError`, `errorContainer`, `onErrorContainer` | Field errors, banners, error icons | Must be clearly different from the brand raspberry (`brief.md` section 8) |
| `destructive`, `onDestructive` | The delete account button | Can share the error colour |
| `info`, `onInfo` | Information banners, such as "New code sent" | |
| `secondaryText` | Helper text, captions, timestamps | Needs separate light and dark values |
| `raisedSurface` | Sheets, dialogs, table headers, the admin sidebar | In dark mode, lighter than `surface` |
| `scrim` | Behind sheets and dialogs | |
| `divider` | Lists and tables | Decorative, no contrast minimum |
| `disabled`, `onDisabled` | Disabled buttons and fields | Disabled text is exempt from contrast, but must still be readable |

Type roles needed beyond S0: a screen title (about 24 sp) and a caption (at least 12 sp), each with Arabic line heights.

## Flows

**Customer sign-in.** A visitor taps Sign in on Account, or meets a sign-in prompt → phone entry → code entry → if the account is new, complete your profile → back to where they started (C-01).

**Delete account.** Account → delete account → confirm → if the last sign-in is too old (`REAUTH_REQUIRED`), confirm it is you with a new code → account deleted → Home as a visitor.

**Admin sign-in.** Admin sign-in → authenticator code → admin home, or the page that was asked for. Wrong tries at either step can lead to the locked screen. A signed-out or ended session returns to admin sign-in with a notice.
