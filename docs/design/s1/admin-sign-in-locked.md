**Draft: needs owner approval**

# S1: Admin sign-in locked

| | |
| --- | --- |
| Screen ID | `s1/admin-sign-in-locked` |
| Product | Admin back office (Next.js), path `/sign-in/locked` |
| Owner of the code | web-dev |
| Approved images | None yet |
| Requirements | A-01 |
| API | None. Shown after `423 ADMIN_SIGN_IN_LOCKED` from `POST /v1/admin/auth/sign-in` or `POST /v1/admin/auth/totp/verify`. |
| Waits on | **Q9**. Plan decisions 1, 5, 6. |

Shared patterns are in [README.md](README.md).

## Purpose

Too many wrong passwords or codes were entered for an email address, so sign-in for that address is locked for a while (`auth.admin.lock_minutes`, default 15). This page says so, says when to try again, and says what to do if the attempts were not the admin's own.

The lock applies to unknown addresses too, so the page never tells whether an account exists. It never shows the email address.

**Known weakness, from `docs/ARCHITECTURE.md` section 9.1:** anyone who knows an admin's email can lock them out for the lock time. The help text tells admins that the owner can unlock them at once (`admin:unlock`).

## Layout, top to bottom

The same centred card as admin sign-in.

| # | Element | Component | Notes |
| --- | --- | --- | --- |
| 1 | Language control | As on admin sign-in | |
| 2 | Product name | Text | |
| 3 | Lock icon and title, "Sign-in locked" | Heading level 1, decorative icon at the start | |
| 4 | Explanation with the wait | Body text | The wait comes from `Retry-After`, rounded up to whole minutes, and the time it ends in Cairo time |
| 5 | Help | Body text | If these attempts were not yours, tell the owner, who can unlock now |
| 6 | "Back to sign-in" | Secondary button | |

## States

| State | Cause | What the admin sees |
| --- | --- | --- |
| Locked | Redirect after `423 ADMIN_SIGN_IN_LOCKED` | The page with the wait and the end time. The route handler passes only the end time to this page, never the email. |
| Lock ended | The end time passes while the page is open | With scripts: the explanation changes to `admin.locked.ended`, and the button becomes primary. Without scripts: the page stays as it is; "Back to sign-in" works. |
| No lock information | The page is opened directly | Redirect to admin sign-in |
| Narrow screen or 200% zoom | | The card fills the width; nothing is cut off |

## Text

| Key | English | Arabic (needs owner review) | Notes |
| --- | --- | --- | --- |
| `admin.locked.title` | Sign-in locked | تم قفل تسجيل الدخول | Heading |
| `admin.locked.pageTitle` | Sign-in locked · FeenGo Admin | تم قفل تسجيل الدخول · إدارة FeenGo | Browser tab |
| `error.ADMIN_SIGN_IN_LOCKED` | There were too many wrong passwords or codes for this email. Try again in {duration}, at {time}. | تم إدخال كلمات مرور أو رموز خاطئة عدة مرات لهذا البريد الإلكتروني. يُرجى المحاولة مرة أخرى بعد {duration}، في الساعة {time}. | `{time}` in Cairo time, `HH:mm`, left to right |
| `admin.locked.help` | If these attempts weren't yours, tell the FeenGo owner. They can unlock sign-in straight away. | في حال عدم معرفة مصدر هذه المحاولات، يُرجى إبلاغ مالك FeenGo، إذ يمكن إلغاء القفل فورًا. | |
| `admin.locked.ended` | You can try again now. | يمكن المحاولة الآن. | |
| `admin.locked.back` | Back to sign-in | العودة إلى تسجيل الدخول | |

## Right-to-left notes

**Mirrors:** text alignment, the icon at the start (right), the language control.

**Does not mirror:** the time `HH:mm`, the lock icon glyph.

## Interactions

| Action | Result |
| --- | --- |
| "Back to sign-in" | Admin sign-in, empty. Trying before the lock ends leads back here. |

## Accessibility

- Focus starts on the title; the explanation follows.
- The change when the lock ends is announced once (`aria-live="polite"`).
- **Focus order:** language control, title, explanation, help, button.
- Button at least 44 by 44 px. Works at 200% zoom.
