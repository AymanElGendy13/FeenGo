**Draft: needs owner approval**

# S1: Admin sign-in (email and password)

| | |
| --- | --- |
| Screen ID | `s1/admin-sign-in` |
| Product | Admin back office (Next.js), path `/sign-in` |
| Owner of the code | web-dev |
| Approved images | None yet |
| Requirements | A-01 |
| API | The page posts to the website's route handler `POST /session/password`, which calls `POST /v1/admin/auth/sign-in` (`docs/ARCHITECTURE.md` section 8.3) |
| Waits on | **Q9** (admin sign-in with email, password and authenticator app). Plan decisions 1, 5, 6. |

Shared patterns are in [README.md](README.md).

## Purpose

The first of two sign-in steps for the FeenGo team. A correct email and password lead to the authenticator code step. No admin page opens before both steps succeed (A-01).

**Q9.** This screen exists only under the architect's proposal of email, password and an authenticator code. If the owner chooses another method, this spec and the next two are rewritten.

Admin accounts are created only by a server command (`docs/ARCHITECTURE.md` section 9.2). There is no sign-up, no "forgot password" and no "remember me".

## Layout, top to bottom

Desktop first, works on a tablet and a phone. One centred card, at most 400 px wide, on the `surface` background. Card padding 32 px (24 px under 480 px wide).

| # | Element | Component | Notes |
| --- | --- | --- | --- |
| 1 | Language control | Two links or a small radio group, "English" and "العربية", at the top end of the page, outside the card | The same cookie as every admin page. **First visit: always English** (`docs/DECISIONS.md`, 2026-11-19), whatever the browser's language. Only the admin's own choice here, or on any admin page, changes it. |
| 2 | Product name, "FeenGo Admin" | Text, not a heading | `admin.app.name` from S0 |
| 3 | Title, "Sign in" | Heading level 1 | |
| 4 | Notice | Inline banner, information | Only after signing out or a session ending (see `admin-signed-out.md`) or a timed-out second step |
| 5 | Error | Inline banner, error | Errors about the whole attempt |
| 6 | Email | Text field | `type="email"`, `autocomplete="username"`. Focused on load. |
| 7 | Password | Password field | `type="password"`, `autocomplete="current-password"`, with a "Show password" toggle button at the end of the field |
| 8 | "Continue" | Primary button | Full card width |
| 9 | Help | Caption | Who to contact for a lost password or authenticator |

The page is a plain HTML form that posts to the route handler, so it works before the page's scripts load.

## States

| State | Cause | What the admin sees |
| --- | --- | --- |
| Empty | Page opens | Fields empty, email focused |
| Missing field | Client check, or `400 VALIDATION_FAILED` `/email` `REQUIRED` or `/password` `REQUIRED` | Field message `admin.signIn.error.emailRequired` or `passwordRequired` |
| Email not valid | Client check, or `400` `/email` `FORMAT_EMAIL` | Field message `admin.signIn.error.emailFormat` |
| Password too long | `400` `/password` `TOO_LONG` | Field message `admin.signIn.error.passwordTooLong` |
| Checking | Form posted | Button progress, spoken `admin.signIn.checking`. Fields read-only. |
| Password accepted | `200 AdminMfaChallenge` | The route handler sets the short `mfa` cookie and redirects to the authenticator code page. No session yet. |
| Disabled admin, correct password | Not defined by the contract (README, gap G3) | **Assumed** until G3 is answered: the API answers `401 INVALID_CREDENTIALS`, so this page shows the same message as a wrong password and reveals nothing. If the architect instead lets the password step succeed, the disabled message appears on the authenticator code page (`403 ADMIN_DISABLED`). |
| Wrong email or password | `401 INVALID_CREDENTIALS` | Banner `error.INVALID_CREDENTIALS`. The password field is cleared and focused; the email stays. It never says which one is wrong, and never shows tries left. |
| Locked | `423 ADMIN_SIGN_IN_LOCKED` | Redirect to the locked page, with the wait from `Retry-After` |
| Too many requests | `429 RATE_LIMITED` | Banner `error.RATE_LIMITED` with the wait. "Continue" disabled until it ends (with scripts), or refused again (without). |
| Service down | `503 SERVICE_UNAVAILABLE`, `500 INTERNAL_ERROR` | Banner with the shared message. `INTERNAL_ERROR` also shows the request ID, because admins can report it. The email stays. |
| Offline | The browser cannot reach the website | The browser's own error page, because the form posts to the server. With scripts loaded, the page catches it first and shows `common.offline.message`. |
| Already signed in | A valid session cookie | `proxy.ts` sends the admin to the admin home (or `from`) instead of showing this page |
| Narrow screen or 200% zoom | | The card fills the width with 16 px margins. Nothing is cut off. |

## Text

| Key | English | Arabic (needs owner review) | Notes |
| --- | --- | --- | --- |
| `admin.app.name` | FeenGo Admin | إدارة FeenGo | Existing S0 key. Provisional. |
| `admin.signIn.title` | Sign in | تسجيل الدخول | Heading |
| `admin.signIn.pageTitle` | Sign in · FeenGo Admin | تسجيل الدخول · إدارة FeenGo | Browser tab title |
| `admin.signIn.email` | Email | البريد الإلكتروني | |
| `admin.signIn.password` | Password | كلمة المرور | |
| `admin.signIn.showPassword` | Show password | إظهار كلمة المرور | Toggle, pressed state off |
| `admin.signIn.hidePassword` | Hide password | إخفاء كلمة المرور | Toggle, pressed state on |
| `admin.signIn.submit` | Continue | متابعة | Primary |
| `admin.signIn.checking` | Checking | جارٍ التحقق | Spoken |
| `admin.signIn.help` | Lost your password or your authenticator app? Ask the FeenGo owner to reset your account. | في حال فقدان كلمة المرور أو تطبيق المصادقة، يُرجى التواصل مع مالك FeenGo لإعادة ضبط الحساب. | See the gap list: no password reset command exists |
| `admin.signIn.error.emailRequired` | Enter your email. | يُرجى إدخال البريد الإلكتروني. | |
| `admin.signIn.error.emailFormat` | Enter an email address like name@example.com. | يُرجى إدخال بريد إلكتروني صحيح، مثل name@example.com. | |
| `admin.signIn.error.passwordRequired` | Enter your password. | يُرجى إدخال كلمة المرور. | |
| `admin.signIn.error.passwordTooLong` | This password is too long. Check it and try again. | كلمة المرور هذه طويلة جدًا. يُرجى التحقق منها والمحاولة مرة أخرى. | |
| `error.INVALID_CREDENTIALS` | The email or password is wrong. Check both and try again. | البريد الإلكتروني أو كلمة المرور غير صحيحة. يُرجى التحقق منهما والمحاولة مرة أخرى. | |

Also used: shared errors, `settings.language.option.en` and `.ar`.

## Right-to-left notes

**Mirrors:** text alignment, the language control at the top left, labels and messages on the right, the show-password button at the end (left) of the password field.

**Does not mirror:** the email and password values are always left to right and aligned left. "FeenGo" inside the Arabic product name is a left-to-right isolate.

The page sets `<html lang dir>` on the server, so it never flashes the wrong direction (S0 rule).

## Interactions

| Action | Result |
| --- | --- |
| Submit (button or enter) | Posts the form to `POST /session/password` |
| "Show password" | Shows the password as text, and the button becomes "Hide password". It never stays shown after a submit. |
| Language control | Switches the page's language and direction. Typed values stay. |

## Accessibility

- **Labels** are visible `<label>` elements tied to their fields. No placeholder text.
- **Errors:** field messages are tied with `aria-describedby`, and the field gets `aria-invalid`. After a failed submit, focus moves to the banner (when it is a whole-form error) or to the first invalid field.
- **The banner** is announced (`role="alert"`).
- **The toggle** is a button with `aria-pressed`, labelled "Show password".
- **Focus order:** language control, email, password, show password, "Continue", help.
- **Targets:** the button, the toggle and the language links are at least 44 by 44 px.
- **Zoom:** works at 200% zoom and at 320 px wide with no horizontal scrolling.
- **Password managers:** the `autocomplete` values let them fill both fields.
- **Contrast:** AA in light and dark, from the tokens.

## Review checklist after the build

1. A wrong email and a wrong password give the same message, and no count.
2. No admin page opens after this step alone (A-01 test: "the password step alone never renders an admin page").
3. The form works without scripts.
