**Draft: needs owner approval**

# S1: Admin signed out and session ended

| | |
| --- | --- |
| Screen ID | `s1/admin-signed-out` |
| Product | Admin back office (Next.js). Notices on the admin sign-in page, `/sign-in`. |
| Owner of the code | web-dev |
| Approved images | None yet |
| Requirements | A-01 |
| API | `POST /session/sign-out` (calls `POST /v1/auth/logout`). Session ends come from `proxy.ts` and `requireAdmin()` failing (`docs/ARCHITECTURE.md` section 8.3). |
| Waits on | **Q9**. Plan decisions 1, 6. |

Shared patterns are in [README.md](README.md).

## Purpose

Tells an admin why they are looking at the sign-in page: because they signed out, or because their session ended. Then lets them sign in again and, after a session end, return to the page they were on.

Admin sessions are short on purpose: 30 minutes idle and 12 hours at most (`docs/ARCHITECTURE.md` section 8.1). Without a notice, being sent to sign-in mid-task looks like a fault.

This is not a separate page. It is the admin sign-in page with one of two notices.

## The two cases

| | Signed out | Session ended |
| --- | --- | --- |
| Cause | The admin chose "Sign out" in the header. `POST /session/sign-out` deletes the cookies and calls `POST /v1/auth/logout`; the API logs `admin.signed_out` (A-11). | Refresh failed in `proxy.ts` (`REFRESH_TOKEN_INVALID`, `REFRESH_TOKEN_REUSED`, idle or absolute limit), `requireAdmin()` failed, `GET /v1/admin/me` answered `401`, or `ADMIN_DISABLED` on refresh |
| Redirect | `/sign-in?reason=signed_out` | `/sign-in?reason=session_ended&from=<path>` |
| Notice | `admin.signIn.notice.signedOut` (information) | `admin.signIn.notice.sessionEnded` (information) |
| After signing in again | The admin home | The page in `from`, if it is an admin path on this site. Otherwise the admin home. |
| Disabled account | | `ADMIN_DISABLED` shows `error.ADMIN_DISABLED` as an error banner instead, with no `from` |

**The `reason` and `from` parameters are a proposal.** `docs/ARCHITECTURE.md` section 8.3 says the website redirects to the sign-in page, but not how the page learns why, or where to return (see the gap list). `from` holds a path only, never a full address, and is checked against the list of admin paths so it cannot send anyone to another site. It is kept through both steps in the short `mfa` cookie or a similar server-side value, not in the page.

## Layout

The admin sign-in page (`admin-sign-in.md`), with the notice as an information banner between the title and the email field. Nothing else changes.

## States

| State | Cause | What the admin sees |
| --- | --- | --- |
| Signed out | `reason=signed_out` | Sign-in page with `admin.signIn.notice.signedOut` |
| Session ended | `reason=session_ended` | Sign-in page with `admin.signIn.notice.sessionEnded` |
| Disabled | `ADMIN_DISABLED` from refresh or `GET /v1/admin/me` | Sign-in page with the error banner `error.ADMIN_DISABLED` |
| Sign-out could not reach the API | `POST /v1/auth/logout` fails | Cookies are still deleted and the "signed out" notice is shown. The API session ends on its own within its idle limit. |
| Unknown or missing reason | Any other value | No notice |
| Signed in again | Both steps succeed | The notice is gone; redirect as in the table above |

The notice disappears on the next submit, so it never sits next to an error.

## Text

| Key | English | Arabic (needs owner review) |
| --- | --- | --- |
| `admin.signIn.notice.signedOut` | You've signed out. | تم تسجيل الخروج. |
| `admin.signIn.notice.sessionEnded` | Your session ended, so you've been signed out. Sign in again to carry on where you were. | انتهت الجلسة وتم تسجيل الخروج. يُرجى تسجيل الدخول مرة أخرى للمتابعة من الصفحة نفسها. |

Also used: `error.ADMIN_DISABLED`.

## Right-to-left notes

As admin sign-in. The banner icon is at the start.

## Interactions

| Action | Result |
| --- | --- |
| Sign in again | As admin sign-in, then the redirect above |
| An open form when the session ended | Its typed values are lost. Admin forms that take long typing (from S2, such as rejection reasons) need their own draft-keeping; noted for S2. |

## Accessibility

- The notice is announced once when the page loads (`role="status"`).
- Focus starts on the email field, as on admin sign-in; the notice is read before it in reading order.
- Works at 200% zoom.
