**Draft: needs owner approval**

# S1: Sign-in prompt sheet ("sign in to continue")

| | |
| --- | --- |
| Screen ID | `s1/sign-in-prompt` |
| Product | Customer app (Flutter) |
| Owner of the code | mobile-dev |
| Approved images | None yet |
| Requirements | C-01, the S1 part |
| API | None directly. It starts the phone entry flow. |
| Waits on | Plan decisions 1, 6. Q19 (C-01 is only partly proven in S1). |

Shared patterns are in [README.md](README.md).

## Purpose

A visitor tries to open something that needs an account. Instead of a dead end, a sheet explains why and offers to sign in. After signing in, the visitor returns to exactly that place (C-01: "Booking asks them to sign in, then returns them to the same place").

The mechanism is the route guard in `docs/ARCHITECTURE.md` section 11.1: a screen that needs an account is marked in the route table, and a visitor who opens it is sent to sign-in with `from` set to that screen. This sheet is how that looks.

| Requirement | How this screen serves it |
| --- | --- |
| C-01 | Visitors are asked to sign in only when they need to, can say "Not now", and return to the same place after signing in |

**What S1 proves (Q19).** In S1 only the profile screens need an account. The sheet appears in S1 when:

- a visitor opens a link to edit profile or delete account (for example a test link or a notification later), or
- a signed-in person's session ends while they are on one of those screens (the "session ended" form below).

Searching, opening venues (S3) and booking (S4) reuse this sheet with their own explanation line. Whether S1 counts as done with only this part of C-01 is Q19.

The "Sign in" button on the Account screen's visitor state does **not** show this sheet. The person has already chosen to sign in, so it goes straight to phone entry.

## Layout, top to bottom

A modal bottom sheet over the screen the person was on, or over the last screen that does not need an account. It has a drag handle and rounded top corners. Content padding 24 dp.

| # | Element | Component | Notes |
| --- | --- | --- | --- |
| 1 | Drag handle | Sheet handle | Decorative, hidden from screen readers |
| 2 | Title | Text, heading | "Sign in to continue" |
| 3 | Explanation | Body text | Depends on the reason, see below |
| 4 | "Continue with mobile number" | Primary button | Full width |
| 5 | "Not now" | Text button | Full width, under the primary button |

### Explanation by reason

| Reason | Key | When |
| --- | --- | --- |
| Default | `auth.prompt.body.default` | A visitor opened a screen that needs an account |
| Session ended | `auth.prompt.body.sessionEnded` | Refresh failed with `REFRESH_TOKEN_INVALID` or `REFRESH_TOKEN_REUSED` while the person was on a screen that needs an account |
| Later slices | `auth.prompt.body.<reason>` | Added by S3 and S4, for example "Sign in to book a table". Not in S1. |

## States

| State | Cause | What the person sees |
| --- | --- | --- |
| Shown | Route guard: visitor on a marked screen | The sheet, default explanation |
| Session ended | `401 REFRESH_TOKEN_INVALID` or `REFRESH_TOKEN_REUSED` from `POST /v1/auth/refresh` while on a marked screen | The sheet, "session ended" explanation. The screen under it is the last one that does not need an account, so no personal data stays visible. |
| Session ended on a screen that does not need an account | Same refresh failure, on Home or Account | No sheet. Account shows its visitor state with the notice `account.sessionEnded` (see `account.md`). |
| Account suspended | `403 ACCOUNT_SUSPENDED` from refresh (from S2) | No sheet. The person is signed out, and an alert dialog shows `error.ACCOUNT_SUSPENDED` with "OK". |
| After signing in | The phone entry flow ends with a session | The sheet is gone and the marked screen opens (`from`) |
| Sign-in abandoned | The person closes phone entry or code entry | Back where they were, under no sheet. The marked screen does not open. |
| Offline | | The sheet still shows. Phone entry handles being offline. |
| Largest text | | The sheet grows up to the full screen height and then scrolls. Buttons stay at the bottom of the content, not fixed. |

## Text

| Key | English | Arabic (needs owner review) | Notes |
| --- | --- | --- | --- |
| `auth.prompt.title` | Sign in to continue | تسجيل الدخول للمتابعة | Heading |
| `auth.prompt.body.default` | Sign in or create an account with your mobile number. It's free. | يمكن تسجيل الدخول أو إنشاء حساب برقم الهاتف المحمول، مجانًا. | "Free" is true during the free year (DECISIONS 2026-11-16). Owner may remove it. |
| `auth.prompt.body.sessionEnded` | You've been signed out. Sign in again to carry on from the same place. | تم تسجيل الخروج. يُرجى تسجيل الدخول مرة أخرى للمتابعة من المكان نفسه. | |
| `auth.prompt.action.continue` | Continue with mobile number | المتابعة برقم الهاتف المحمول | Primary |
| `auth.prompt.action.notNow` | Not now | ليس الآن | |

## Right-to-left notes

**Mirrors:** text alignment. Buttons are full width, so nothing else moves.

**Does not mirror:** the sheet slides up from the bottom in both languages.

## Interactions

| Action | Result |
| --- | --- |
| "Continue with mobile number" | Phone entry opens over the sheet's screen, with `from` set to the marked screen. The sheet closes. |
| "Not now", tap on the scrim, drag down, system back | The sheet closes. The person stays on the screen under it. The marked screen does not open. |
| Signed in | The app opens `from`. If the account is new, complete profile comes first, then `from`. |

The sheet opens with the platform's standard sheet motion (about 250 ms), and appears without motion when reduce motion is on.

## Accessibility

- When the sheet opens, focus moves to its title, and the content behind is hidden from screen readers.
- The sheet is announced as a dialog with its title.
- **Focus order:** title, explanation, "Continue with mobile number", "Not now".
- When it closes with "Not now", focus returns to the control that opened it, or to the screen's title.
- **Touch targets:** both buttons at least 48 dp tall.
- **Largest text size:** the sheet scrolls; nothing is cut off.
- Dismissing by dragging is never the only way: "Not now" is always there.

## Review checklist after the build

1. A visitor opening edit profile sees the sheet, signs in, and lands on edit profile (the S1 test of C-01).
2. "Not now" leaves them exactly where they were.
3. A session ended on edit profile shows the "session ended" form, with no personal data left visible behind it.
