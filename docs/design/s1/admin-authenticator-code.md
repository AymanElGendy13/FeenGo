**Draft: needs owner approval**

# S1: Admin authenticator code

| | |
| --- | --- |
| Screen ID | `s1/admin-authenticator-code` |
| Product | Admin back office (Next.js), path `/sign-in/code` |
| Owner of the code | web-dev |
| Approved images | None yet |
| Requirements | A-01 |
| API | The page posts to `POST /session/totp`, which calls `POST /v1/admin/auth/totp/verify` with the `mfaToken` from the short `mfa` cookie (`docs/ARCHITECTURE.md` section 8.3) |
| Waits on | **Q9**. Plan decisions 1, 5, 6. |

Shared patterns (code input, digits, errors) are in [README.md](README.md).

## Purpose

The second sign-in step. The admin enters the 6-digit code from their authenticator app. Only after this does the website set the session, and only then does any admin page open (A-01).

The authenticator was set up when the account was created, by the server command (`docs/ARCHITECTURE.md` section 9.2). There is no setup screen; see README, "Not specified".

## Layout, top to bottom

The same centred card as admin sign-in.

| # | Element | Component | Notes |
| --- | --- | --- | --- |
| 1 | Language control | As on admin sign-in | |
| 2 | Product name | Text | `admin.app.name` |
| 3 | Title, "Enter your authenticator code" | Heading level 1 | |
| 4 | Explanation | Body text | Open the authenticator app, enter the code for FeenGo Admin |
| 5 | Error | Inline banner, error | Errors about the whole attempt |
| 6 | Code | Code input, six boxes | One `<input>` with `inputmode="numeric"`, `autocomplete="one-time-code"`, `pattern="[0-9]*"`, max length 6. Always left to right. Focused on load. |
| 7 | Field message | Under the code | Wrong code with tries left |
| 8 | "Sign in" | Primary button | Kept on the web, because a form must work without scripts. With scripts, the sixth digit also submits. |
| 9 | Hint | Caption | The code changes every 30 seconds |
| 10 | "Use a different account" | Text link | Back to admin sign-in, clearing the `mfa` cookie |

## States

| State | Cause | What the admin sees |
| --- | --- | --- |
| Ready | Redirect from admin sign-in with a valid `mfa` cookie | Empty code, focused |
| No second step in progress | The page is opened without an `mfa` cookie | Redirect to admin sign-in |
| Checking | Form posted | Button progress, spoken `admin.totp.checking` |
| Signed in | `200 AdminSession` | The route handler deletes the `mfa` cookie, sets the session cookies and redirects to `from` if one was kept, otherwise the admin home |
| Wrong or reused code | `401 TOTP_INVALID` with `attemptsRemaining` | Code cleared and focused. Field message `error.TOTP_INVALID` with the tries left for this sign-in. |
| Step timed out or used up | `401 MFA_TOKEN_INVALID` (the `mfaToken` expired after 5 minutes or ran out of tries), or the `mfa` cookie expired | Redirect to admin sign-in, with the notice `admin.signIn.notice.mfaExpired` |
| Locked | `423 ADMIN_SIGN_IN_LOCKED` (wrong codes count toward the same lock as wrong passwords) | Redirect to the locked page |
| Account disabled | `403 ADMIN_DISABLED` | Banner `error.ADMIN_DISABLED`. The code field and button are disabled. Only "Use a different account" remains. |
| Too many requests | `429 RATE_LIMITED` | Banner with the shared message and the wait |
| Service down | `503`, `500` | Banner with the shared message; `INTERNAL_ERROR` shows the request ID. The code stays, so "Sign in" can be pressed again if the code has not changed. |
| Code not six digits | Client check, or `400 VALIDATION_FAILED` `/code` | Field message `admin.totp.error.format` |
| Narrow screen or 200% zoom | | The boxes become one plain field when six 44 px boxes do not fit |

## Text

| Key | English | Arabic (needs owner review) | Notes |
| --- | --- | --- | --- |
| `admin.totp.title` | Enter your authenticator code | إدخال رمز تطبيق المصادقة | Heading |
| `admin.totp.pageTitle` | Authenticator code · FeenGo Admin | رمز المصادقة · إدارة FeenGo | Browser tab title |
| `admin.totp.body` | Open your authenticator app and enter the {length}-digit code for FeenGo Admin. | يُرجى فتح تطبيق المصادقة وإدخال الرمز المكوّن من {length} أرقام الخاص بإدارة FeenGo. | `{length}` is 6, filled by the number formatter |
| `admin.totp.field` | Authenticator code | رمز المصادقة | Label |
| `admin.totp.submit` | Sign in | تسجيل الدخول | Primary |
| `admin.totp.checking` | Checking code | جارٍ التحقق من الرمز | Spoken |
| `admin.totp.hint` | The code changes every {duration}. If it's about to change, wait for the next one. | يتغيّر الرمز كل {duration}. إذا كان على وشك التغيّر، يُرجى انتظار الرمز التالي. | `{duration}` is 30 seconds (the TOTP step, not a setting), from `common.duration.seconds`. Arabic needs review: "كل 30 ثانية" reads correctly with the plural form. |
| `admin.totp.differentAccount` | Use a different account | استخدام حساب آخر | |
| `admin.totp.error.format` | Enter the {length} digits from your authenticator app. | يُرجى إدخال الأرقام الـ {length} من تطبيق المصادقة. | `{length}` is 6, filled by the number formatter |
| `error.TOTP_INVALID` | That code isn't right, or it was already used. {count, plural, one {# try left.} other {# tries left.}} | الرمز غير صحيح أو سبق استخدامه. {count, plural, zero {لا توجد محاولات متبقية.} one {تتبقى محاولة واحدة.} two {تتبقى محاولتان.} few {تتبقى # محاولات.} many {تتبقى # محاولة.} other {تتبقى # محاولة.}} | `count` from `attemptsRemaining` |
| `error.MFA_TOKEN_INVALID` | Sign-in took too long. Enter your password again. | استغرق تسجيل الدخول وقتًا طويلًا. يُرجى إدخال كلمة المرور مرة أخرى. | Shown as `admin.signIn.notice.mfaExpired` on admin sign-in; same text |
| `admin.signIn.notice.mfaExpired` | Sign-in took too long. Enter your password again. | استغرق تسجيل الدخول وقتًا طويلًا. يُرجى إدخال كلمة المرور مرة أخرى. | |
| `error.ADMIN_DISABLED` | This admin account is disabled. Contact the FeenGo owner. | تم تعطيل حساب الإدارة هذا. يُرجى التواصل مع مالك FeenGo. | |

## Right-to-left notes

**Mirrors:** text alignment, the language control, "Use a different account" at the start.

**Does not mirror:** the code boxes, always left to right with the first digit on the left. Digits follow plan decision 5 for display; input accepts both sets.

## Interactions

| Action | Result |
| --- | --- |
| Type or paste the code | With scripts, the sixth digit submits. Paste accepts "123 456". |
| "Sign in" or enter | Posts to `POST /session/totp` |
| "Use a different account" | Clears the `mfa` cookie, back to admin sign-in |
| Browser back | Admin sign-in. The `mfa` cookie stays until it expires, which does no harm. |

## Accessibility

- **The code** is one labelled input, not six. The boxes are drawing only.
- **Errors** as on admin sign-in: `aria-describedby`, `aria-invalid`, banner with `role="alert"`, focus to the code after a wrong try.
- **Focus order:** language control, code, "Sign in", hint, "Use a different account".
- **Targets:** at least 44 by 44 px.
- **Zoom:** 200% and 320 px wide without horizontal scrolling.
- **Password managers** that store authenticator codes can fill the field (`autocomplete="one-time-code"`).

## Review checklist after the build

1. Without this step, no admin page opens, including by client-side navigation (A-01 tests in `docs/ARCHITECTURE.md` section 8.3).
2. A reused code is refused with the same message as a wrong one.
3. After 5 minutes on this page, the next try returns to the password step with a clear notice.
