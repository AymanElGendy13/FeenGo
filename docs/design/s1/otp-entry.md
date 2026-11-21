**Draft: needs owner approval**

# S1: Code entry

| | |
| --- | --- |
| Screen ID | `s1/otp-entry` |
| Product | Customer app (Flutter) |
| Owner of the code | mobile-dev |
| Approved images | None yet |
| Requirements | C-02. Also C-04, when it confirms the person before deleting the account. |
| API | `POST /v1/auth/otp/verify`, `POST /v1/auth/otp/request` (resend), `PATCH /v1/me` (language, after sign-in) |
| Waits on | Plan decisions 1, 5, 6, 7. Q18 (code rules as settings), Q20 (testers). |

Shared patterns (code input, digits, times from the server, errors, loading) are in [README.md](README.md).

## Purpose

The person enters the code that FeenGo sent. A correct code signs them in, or creates their account if the number is new. The screen also handles every way this can go wrong: a wrong code, a code that expired, a code that never arrived, and a lock after too many wrong codes.

| Requirement | How this screen serves it |
| --- | --- |
| C-02 | Checks the code. Says which channel it came by. Offers SMS when WhatsApp does not arrive. Shows expiry and the lock, with times from the server. |
| C-04 | In "confirm" mode, proves it is still the account holder before the account is deleted (`REAUTH_REQUIRED`, see `delete-account.md`) |

**Q18.** Expiry, tries, lock time and the resend wait are settings under the proposal, or configuration if the owner refuses. Either way this screen reads them from each response and never shows a fixed number. The screen is the same under both answers.

## Modes

| | Sign-in mode | Confirm mode |
| --- | --- | --- |
| Opened from | Phone entry | Delete account, after `403 REAUTH_REQUIRED` |
| Title | `auth.code.title` | `auth.code.confirmTitle` |
| "Change number" link | Shown | Hidden. The number is the account's own. |
| After a correct code | Complete profile if the account is new, otherwise back to `from` | Back to delete account, which deletes at once |
| Analytics | `sign_up` (method `phone`) if `isNewCustomer`, otherwise `login` | None |

## Layout, top to bottom

One column inside the safe area, 24 dp side padding, at most 480 dp wide. It scrolls when taller than the screen.

| # | Element | Component | Notes |
| --- | --- | --- | --- |
| 1 | Top bar | App bar with back button at the top start | |
| 2 | Title | Text, heading, screen title type | |
| 3 | Where the code went | Body text | "We sent a code by WhatsApp to +20 10 1234 5678." The number is a left-to-right isolate, never truncated. |
| 4 | "Change number" | Text button (link style) | Sign-in mode only. Directly under the explanation, aligned to the start. |
| 5 | Inline banner | Inline banner, error or information | Errors about the whole code (expired, locked, delivery failed) and "New code sent" |
| 6 | Code input | Code input, six boxes | 32 dp below. Label above it ("6-digit code"). Focused on opening, number keyboard shown. |
| 7 | Field message | Under the code input | Wrong code, with tries left |
| 8 | Resend area | Text, then text buttons | 24 dp below. A countdown, then the resend actions. |

There is no primary button. The code is checked when the sixth digit arrives. While it is checked, a small progress indicator replaces the resend area, with the spoken text "Checking code".

### The resend area

| Last code went by | During the wait | After the wait |
| --- | --- | --- |
| WhatsApp | "Resend code in 0:42" (text, not a button) | Two buttons: "Resend code" (`channel: auto`) and "Send by SMS instead" (`channel: sms`) |
| SMS | "Resend code in 0:42" | One button: "Send a new code by SMS" (`channel: sms`). The last code came by SMS either because WhatsApp refused this number or because the person chose SMS, so the next code goes the same way. |

The wait comes from `resendAvailableAt`. The countdown updates once a second on screen, but screen readers are not interrupted by it (see Accessibility).

## States

| State | Cause | What the person sees |
| --- | --- | --- |
| Waiting for the code | `202` from phone entry, channel `whatsapp` | `auth.code.sentWhatsApp`. Countdown to resend. |
| Code came by SMS after WhatsApp refused | `202`, request `channel: auto`, response `channel: sms` | `auth.code.sentSmsFallback` instead of the plain SMS line |
| Code came by SMS on request | `202`, request `channel: sms` | `auth.code.sentSms` |
| Checking | Sixth digit entered, verify in flight | Code boxes read-only, progress in the resend area |
| Signed in | `200 CustomerSession` | Sign-in mode: if `isNewCustomer`, complete profile; otherwise back to `from`. Confirm mode: back to delete account. No success screen. |
| Wrong code | `401 OTP_INVALID` with `attemptsRemaining` | Boxes clear, focus returns to the first box, field message `error.OTP_INVALID` with the tries left. A short shake of the boxes, removed when reduce motion is on. |
| Last try left | `401 OTP_INVALID`, `attemptsRemaining` is 1 | `error.OTP_INVALID.last`, which warns that one more wrong code pauses sign-in |
| Locked | `423 OTP_LOCKED`, from verify or from a resend | Banner `error.OTP_LOCKED` with the wait from `retryAfterSeconds`. Code boxes and resend actions disabled. One button: `auth.code.action.useAnotherNumber` (sign-in mode) or "Back" (confirm mode). The wait counts down in the banner. When it ends, the banner changes to `auth.code.lockEnded` with a "Send a new code" button. |
| Expired, noticed by the app | Local timer passes `expiresAt` | Banner `error.OTP_EXPIRED`. The resend actions are shown at once, even if the resend wait has not ended. Until gap G11 is answered, the code boxes stay enabled, because the phone's clock may be wrong; only the server's `410 OTP_EXPIRED` disables them (README, "Times and durations from the server"). If a resend inside the wait gets `OTP_RESEND_TOO_SOON`, see that row. |
| Expired, told by the server | `410 OTP_EXPIRED` | Banner `error.OTP_EXPIRED`. Code boxes disabled. Resend actions shown at once. |
| Replaced by a newer code | `409 OTP_ALREADY_USED` | Banner `error.OTP_ALREADY_USED`. Boxes clear and stay enabled, so the latest code can be entered if the app holds the latest challenge. Otherwise the resend actions show. This never counts as a wrong try. |
| Unknown challenge | `404 OTP_CHALLENGE_NOT_FOUND` | Banner `error.OTP_CHALLENGE_NOT_FOUND`, resend actions shown |
| Requested on another phone | `403 OTP_DEVICE_MISMATCH` | Banner `error.OTP_DEVICE_MISMATCH`, resend actions shown. A new code is requested from this phone. |
| Account suspended | `403 ACCOUNT_SUSPENDED` (from S2) | Banner `error.ACCOUNT_SUSPENDED`. Boxes and resend disabled. One button: "Back". The message names no contact yet (S1-Q4). |
| Resending | Resend tapped, request in flight | The tapped button shows progress |
| New code sent | `202` from a resend | Information banner `auth.code.resent`, which says earlier codes no longer work. Explanation line updated for the new channel. Countdown restarts. Boxes clear, focus to the first box. |
| Resend too soon | `429 OTP_RESEND_TOO_SOON` | Countdown restarts from `retryAfterSeconds`. No banner. This happens only when the app's clock and the server's disagree, or after expiry inside the wait. |
| Resend limit reached | `429 RATE_LIMITED` on resend | Banner `auth.phone.error.rateLimited` with the wait. Resend actions disabled until it ends. The current code, if not expired, can still be entered. |
| Resend failed on both channels | `503 OTP_DELIVERY_FAILED` on resend | Banner `error.OTP_DELIVERY_FAILED.resend`. Nothing counted. The earlier code still works, so the boxes stay enabled. Resend actions enabled at once. |
| Too many verify calls | `429 RATE_LIMITED` on verify | Banner with the shared `error.RATE_LIMITED` |
| Service down | `503 SERVICE_UNAVAILABLE`, `500 INTERNAL_ERROR`, timeout | Banner with the shared message. The digits stay in the boxes, and "Try again" checks the same code again. A retried successful check can answer `409 OTP_ALREADY_USED`; if the app then has no session, it shows that row's message. |
| Offline | No connection when checking or resending | Banner `common.offline.message`. The digits stay. Checking starts again by itself when the connection returns, once. |
| App reopened | The app was closed or killed while the person read the code in WhatsApp or Messages | The app keeps the challenge (ID, number, channel, times) in secure storage until `expiresAt`. Reopening the app before then returns to this screen with the countdown correct. After `expiresAt` the stored challenge is deleted. |
| Largest text | | Boxes switch to one plain field when they no longer fit (README, "Code input"). Text wraps. The resend buttons stack vertically. |

After sign-in, the app compares the account's `language` with the app's current language. The app's current language wins: if they differ, the app sends `PATCH /v1/me` with it. This is a proposal ([README.md](README.md), gap G10). The person sees nothing.

## Text

Arabic copy needs owner review (plan decisions 5 and 6).

| Key | English | Arabic (needs owner review) | Notes |
| --- | --- | --- | --- |
| `auth.code.title` | Enter the code | إدخال الرمز | Sign-in mode heading |
| `auth.code.confirmTitle` | Confirm it's you | تأكيد الهوية | Confirm mode heading |
| `auth.code.sentWhatsApp` | We sent a code by WhatsApp to {phone}. | أرسلنا رمزًا عبر واتساب إلى {phone}. | `{phone}` is a left-to-right isolate |
| `auth.code.sentSms` | We sent a code by SMS to {phone}. | أرسلنا رمزًا برسالة نصية إلى {phone}. | |
| `auth.code.sentSmsFallback` | WhatsApp couldn't deliver it, so we sent the code by SMS to {phone}. | تعذّر الإرسال عبر واتساب، لذلك أرسلنا الرمز برسالة نصية إلى {phone}. | |
| `auth.code.changeNumber` | Change number | تغيير الرقم | |
| `auth.code.field.label` | {length}-digit code | رمز من {length} أرقام | `{length}` from `codeLength`, which is 6 |
| `auth.code.checking` | Checking code | جارٍ التحقق من الرمز | Spoken |
| `auth.code.resendIn` | Resend code in {countdown} | إعادة إرسال الرمز بعد {countdown} | `{countdown}` as `m:ss` |
| `auth.code.action.resend` | Resend code | إعادة إرسال الرمز | WhatsApp then SMS |
| `auth.code.action.sms` | Send by SMS instead | الإرسال برسالة نصية بدلًا من ذلك | |
| `auth.code.action.smsAgain` | Send a new code by SMS | إرسال رمز جديد برسالة نصية | |
| `auth.code.resent` | New code sent. Earlier codes no longer work. | تم إرسال رمز جديد. الرموز السابقة لم تعد صالحة. | Information banner |
| `error.OTP_INVALID` | That code isn't right. {count, plural, one {# try left.} other {# tries left.}} | الرمز غير صحيح. {count, plural, zero {لا توجد محاولات متبقية.} one {تتبقى محاولة واحدة.} two {تتبقى محاولتان.} few {تتبقى # محاولات.} many {تتبقى # محاولة.} other {تتبقى # محاولة.}} | `count` from `attemptsRemaining` |
| `error.OTP_INVALID.last` | That code isn't right. One try left. After another wrong code, sign-in with this number pauses for a while. | الرمز غير صحيح. تتبقى محاولة واحدة، وبعد رمز خاطئ آخر سيتوقف تسجيل الدخول بهذا الرقم مؤقتًا. | The lock time is not known until the lock happens, so it is not stated |
| `error.OTP_LOCKED` | Too many wrong codes for this number. To protect the account, sign-in with it is paused. Try again in {duration}. | تم إدخال رموز خاطئة عدة مرات لهذا الرقم. لحماية الحساب، تم إيقاف تسجيل الدخول به مؤقتًا. يُرجى المحاولة مرة أخرى بعد {duration}. | Shared with phone entry |
| `auth.code.lockEnded` | You can try again now. Ask for a new code. | يمكن المحاولة الآن. يُرجى طلب رمز جديد. | |
| `auth.code.action.newCode` | Send a new code | إرسال رمز جديد | After the lock ends |
| `auth.code.action.useAnotherNumber` | Use a different number | استخدام رقم آخر | Locked, sign-in mode |
| `error.OTP_EXPIRED` | This code has expired. Ask for a new one. | انتهت صلاحية هذا الرمز. يُرجى طلب رمز جديد. | |
| `error.OTP_ALREADY_USED` | This code no longer works because a newer one was sent. Enter the latest code, or ask for a new one. | لم يعد هذا الرمز صالحًا لأنه تم إرسال رمز أحدث. يُرجى إدخال أحدث رمز أو طلب رمز جديد. | |
| `error.OTP_CHALLENGE_NOT_FOUND` | This code no longer works. Ask for a new one. | لم يعد هذا الرمز صالحًا. يُرجى طلب رمز جديد. | |
| `error.OTP_DEVICE_MISMATCH` | This code was asked for on another phone. Ask for a new code on this phone. | تم طلب هذا الرمز من هاتف آخر. يُرجى طلب رمز جديد من هذا الهاتف. | |
| `error.OTP_DELIVERY_FAILED.resend` | We couldn't send a new code by WhatsApp or SMS. Your earlier code still works if it hasn't expired. Try again. | تعذّر إرسال رمز جديد عبر واتساب أو برسالة نصية. لا يزال الرمز السابق صالحًا إذا لم تنتهِ صلاحيته. يُرجى المحاولة مرة أخرى. | |

Also used: `error.ACCOUNT_SUSPENDED`, `auth.phone.error.rateLimited`, the shared errors, `common.action.back`.

## Right-to-left notes

**Mirrors in Arabic**

- Text alignment, the back button (top right, arrow pointing right), banners and the resend area align right.
- "Change number" sits at the start, on the right.
- The two resend buttons are in logical order: "Resend code" first, at the start.

**Does not mirror**

- **The code boxes.** The first digit is always in the leftmost box, in both languages, and typing moves left to right. Codes are read and typed left to right, and the WhatsApp and SMS message shows them that way.
- The phone number inside the explanation, a left-to-right isolate.
- The countdown `m:ss`.
- The shake on a wrong code is horizontal and symmetric, so it does not need mirroring.

## Interactions

| Action | Result |
| --- | --- |
| Type, paste or autofill six digits | Checked at once with `POST /v1/auth/otp/verify` (challenge ID, code with Western digits, device: installation ID, platform, app version) |
| Fewer than six digits | Nothing is sent. No error is shown while typing. |
| "Change number" | Back to phone entry with the number filled in. The challenge is kept, so returning gets back to this screen with "Enter the code" if the wait has not ended. |
| "Resend code" | `POST /v1/auth/otp/request`, same number, `channel: auto` |
| "Send by SMS instead" or "Send a new code by SMS" | Same, with `channel: sms` |
| Back, system back or swipe back | Sign-in mode: to phone entry, as "Change number". Confirm mode: to delete account, nothing deleted. |
| Signed in, new account | Complete profile replaces this screen, so back does not return here |
| Signed in, existing account | The whole flow closes and the app returns to `from` (C-01). A snackbar is not shown; arriving where they were is enough. |
| Signed in, with an "unsure deletion" record for this number | Before anything else, the app follows `delete-account.md`, "Unsure deletion", using `isNewCustomer` |

**Autofill and paste**

- **iOS:** the field declares the one-time-code content type, so codes from Messages (SMS) are offered above the keyboard. WhatsApp codes are not offered by iOS, so paste must work: the system paste menu on a long press, and a pasted message with one six-digit number is accepted. The app never reads the clipboard by itself, which would trigger iOS's paste prompt.
- **Android:** the field declares the one-time-code autofill hint. Which automatic methods are used (the SMS User Consent API, the SMS Retriever API, or WhatsApp's one-tap autofill for authentication templates) is for the architect, because each needs a library or a change to the message text. The design supports any of them: a code that arrives fills the boxes and is checked at once.
- Password managers that offer codes are allowed.

## Accessibility

- **Title** is a heading.
- **The code input** is one field, announced as "6-digit code, text field". Digits are read as typed. The boxes are not separate focus stops.
- **Field message and banners** are announced when they appear. A wrong code is announced as the message, for example "That code isn't right. 3 tries left."
- **Countdown:** not announced every second. Its spoken label is the full sentence, read when focused. When the wait ends, "You can resend the code now" is announced once (`auth.code.resendReady`, below).
- **Focus order:** back, title, explanation, "Change number", banner if any, code input, resend area.
- **Touch targets:** back, "Change number" and each resend button are at least 44 by 44 points. Each box is at least 44 by 44 points; at sizes where this no longer fits, the single-field fallback is used.
- **Largest text size:** nothing cut off; see the fallback above.
- **Motion:** the shake is 200 ms or less and is replaced by nothing when reduce motion is on. The message carries the meaning.

| Key | English | Arabic (needs owner review) | Notes |
| --- | --- | --- | --- |
| `auth.code.resendReady` | You can resend the code now. | يمكن إعادة إرسال الرمز الآن. | Spoken once when the wait ends |

## Review checklist after the build

1. In Arabic, the first digit sits in the leftmost box.
2. Pasting "493 027", "٤٩٣٠٢٧" and a whole WhatsApp message each fill the boxes and sign in.
3. Every state above shows its own message, with waits and tries from the server.
4. Switching to WhatsApp and back, including after the app is killed, keeps the person on this screen.
5. Six boxes at the largest text size fall back to one field without cutting anything off.
