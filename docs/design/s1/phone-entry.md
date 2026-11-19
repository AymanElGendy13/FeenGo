**Draft: needs owner approval**

# S1: Phone number entry

| | |
| --- | --- |
| Screen ID | `s1/phone-entry` |
| Product | Customer app (Flutter) |
| Owner of the code | mobile-dev |
| Approved images | None yet |
| Requirements | C-02, C-01 |
| API | `POST /v1/auth/otp/request` |
| Waits on | Plan decisions 1, 5, 6, 7. Q7 (Egyptian numbers only), Q6 (analytics consent), Q20 (testers). S1-Q1 (sign-in at first launch), S1-Q3 (terms line). |

Shared patterns (digits, phone numbers, errors, loading) are in [README.md](README.md).

## Purpose

The first step of signing in or signing up. The person gives a mobile number, and FeenGo sends a code to it. Sign-up and sign-in are the same step: the response is the same for new and existing numbers (`docs/ARCHITECTURE.md` section 7.2), so the screen never says "welcome back" or "new account".

| Requirement | How this screen serves it |
| --- | --- |
| C-02 | Takes the number and asks for a code. Tells the person the code comes by WhatsApp, or SMS if WhatsApp fails. |
| C-01 | The person can always leave without an account and keep browsing. After sign-in, the app returns to the place the person came from. |

## When it appears

| Entry point | `from` (where sign-in returns to) |
| --- | --- |
| "Sign in" on Account, visitor state | Account |
| "Continue with mobile number" on the sign-in prompt sheet | The screen that needed an account |
| "Change number" on code entry | Unchanged |
| First launch, only under option B below | Home |

It opens as a full-screen modal flow (phone entry, code entry, complete profile) over the screen the person came from, so leaving the flow returns to that screen untouched.

### Decision needed: sign-in at first launch (S1-Q1)

| | Option A: open on Home (default if unanswered) | Option B: offer sign-in at first launch |
| --- | --- | --- |
| First launch | Home, as a visitor. No sign-in screen. | Phone entry, before Home |
| Leaving the screen | A close button at the top start | "Continue without an account" under the primary button. No close button. |
| Later launches | Home | Home. The screen is not shown again after the first launch, signed in or not. |
| For | Fewest steps before browsing. Fits C-01 and the architecture ("no sign-in wall on the home screen"). | More sign-ups. Tells people early that an account exists. |
| Against | Fewer people sign up before S4 gives them a reason | One more screen before the person sees anything. Must never feel like a wall. |

Both options use the same screen. Only the leave action differs.

## Layout, top to bottom

One column inside the safe area, 24 dp side padding, at most 480 dp wide and centred on tablets. The column scrolls when it is taller than the screen. The primary button stays above the keyboard.

| # | Element | Component | Notes |
| --- | --- | --- | --- |
| 1 | Top bar | App bar | Option A: close button at the top start. Option B: empty. No title in the bar. |
| 2 | Title, "Sign in or create an account" | Text, heading, screen title type | 24 dp below the bar |
| 3 | Explanation | Body text | 8 dp below the title |
| 4 | Mobile number field | Phone field | 32 dp below. Label above, helper text below. Focused when the screen opens, so the number keyboard shows. |
| 5 | Inline banner | Inline banner, error | Only for errors about the whole request (see States). Appears between the explanation and the field. |
| 6 | "Send code" | Primary button | 24 dp below the field. Full width, at least 48 dp tall. |
| 7 | "Continue without an account" | Text button | Option B only. 8 dp below the primary button. |
| 8 | Terms line | Caption text with two links | 24 dp below. Wording waits on S1-Q3. |

### The phone field (Q7)

| | Q7 yes: Egyptian numbers only (proposal) | Q7 no: more countries |
| --- | --- | --- |
| Prefix | Fixed "+20" inside the field, at the left edge, not tappable | A country button at the left edge showing the flag and code, Egypt by default. Opens a searchable list. |
| Helper text | `auth.phone.field.helperEg` | `auth.phone.field.helperIntl` |
| Client check before sending | 10 digits after +20, or 11 digits starting with 0 | Length for the chosen country |
| Needs from the API | Nothing more | A list of the allowed countries. No endpoint gives it yet (gap). |

The field accepts the number with or without its leading 0, with or without "+20" or "0020", and with spaces or dashes. It shows the digits grouped as they are typed: `10 1234 5678`. The app does not check the operator prefix (010, 011, 012, 015). The server decides (`PHONE_INVALID`), so a new prefix never needs an app release.

Keyboard: phone number keyboard. Autofill: the platform's phone number hint (`AutofillHints.telephoneNumber`), so the phone's own number can be offered.

## States

| State | Cause | What the person sees |
| --- | --- | --- |
| Empty | Screen opens | Field empty and focused. "Send code" enabled. |
| Number too short or empty | Client check on "Send code" | Field message `auth.phone.error.empty` or `auth.phone.error.incomplete`. No request is sent. Focus stays in the field. |
| Sending | Request in flight | Button shows progress, spoken label `auth.phone.sending`. Field read-only. |
| Code sent | `202` with `OtpChallenge` | Goes to code entry with the challenge and the number. |
| Not a valid mobile number | `422 PHONE_INVALID` | Field message `error.PHONE_INVALID`. Focus returns to the field. |
| Country not accepted | `422 PHONE_COUNTRY_NOT_SUPPORTED` | Field message `error.PHONE_COUNTRY_NOT_SUPPORTED`. Under Q7 yes, the app's own check normally stops this first. |
| Code sent moments ago | `429 OTP_RESEND_TOO_SOON` | Banner `auth.phone.error.resendTooSoon` with the wait from `retryAfterSeconds`. If the app still holds that number's challenge, the banner has an "Enter the code" action that opens code entry. Otherwise "Send code" is enabled again when the wait ends. |
| Too many requests | `429 RATE_LIMITED` | Banner `auth.phone.error.rateLimited` with the wait. "Send code" disabled until the wait ends, then enabled. |
| Sign-in locked | `423 OTP_LOCKED` | Banner `error.OTP_LOCKED` with the wait. "Send code" stays enabled, so another number can be used. |
| Both channels failed | `503 OTP_DELIVERY_FAILED` | Banner `error.OTP_DELIVERY_FAILED`. Nothing counted against the person, so they can try again at once. |
| Service down | `503 SERVICE_UNAVAILABLE`, `500 INTERNAL_ERROR`, timeout | Banner with the shared message and "Try again" |
| Offline | No connection when "Send code" is tapped | Banner `common.offline.message`. No request is sent. |
| Unexpected validation error | `400 VALIDATION_FAILED` | Banner `error.VALIDATION_FAILED`. This means an app bug; it is reported to crash reporting with the field codes. |
| Largest text | | Column scrolls. The button stays reachable above the keyboard. The number wraps only at group spaces. |
| No permission, empty list | Not applicable | |

A new request clears any earlier banner or field message.

## Text

Arabic copy needs owner review, including the voice (plan decision 6) and the digits (plan decision 5).

| Key | English | Arabic (needs owner review) | Notes |
| --- | --- | --- | --- |
| `auth.phone.title` | Sign in or create an account | تسجيل الدخول أو إنشاء حساب | Heading |
| `auth.phone.body` | We'll send a code to your mobile by WhatsApp, or by SMS if WhatsApp can't deliver it. | سنرسل رمزًا إلى رقم الهاتف المحمول عبر واتساب، أو برسالة نصية إذا تعذّر الإرسال عبر واتساب. | |
| `auth.phone.field.label` | Mobile number | رقم الهاتف المحمول | |
| `auth.phone.field.prefixLabel` | Egypt, plus 20 | مصر، +20 | Spoken label of the fixed prefix (Q7 yes) |
| `auth.phone.field.helperEg` | Egyptian mobile number, for example 010 1234 5678 | رقم هاتف محمول مصري، مثل 010 1234 5678 | Q7 yes. The example is a left-to-right isolate. |
| `auth.phone.field.helperIntl` | Choose your country, then enter your number | يُرجى اختيار الدولة ثم إدخال الرقم | Q7 no |
| `auth.phone.field.countryButton` | Country: {country}, {code} | الدولة: {country}، {code} | Q7 no. Spoken label. |
| `auth.phone.action.send` | Send code | إرسال الرمز | Primary button |
| `auth.phone.sending` | Sending code | جارٍ إرسال الرمز | Spoken while loading |
| `auth.phone.action.withoutAccount` | Continue without an account | المتابعة بدون حساب | Option B only |
| `auth.phone.action.close` | Close | إغلاق | Option A. Spoken label of the close button. |
| `auth.phone.legal` | By continuing, you agree to the {terms} and the {privacy}. | المتابعة تعني الموافقة على {terms} و{privacy}. | Waits on S1-Q3. Placeholders are links. |
| `legal.terms.title` | Terms of use | شروط الاستخدام | Link text |
| `legal.privacy.title` | Privacy policy | سياسة الخصوصية | Link text |
| `auth.phone.error.empty` | Enter your mobile number. | يُرجى إدخال رقم الهاتف المحمول. | |
| `auth.phone.error.incomplete` | This number is too short. Enter all 11 digits, starting with 01. | هذا الرقم قصير. يُرجى إدخال الأرقام الـ 11 كاملة، بدءًا بـ 01. | Q7 yes. Under Q7 no, a per-country message. |
| `error.PHONE_INVALID` | This isn't a mobile number we can send a code to. Check it and try again. | لا يمكن إرسال رمز إلى هذا الرقم لأنه ليس رقم هاتف محمول صالحًا. يُرجى التحقق منه والمحاولة مرة أخرى. | |
| `error.PHONE_COUNTRY_NOT_SUPPORTED` | For now, FeenGo works with Egyptian mobile numbers only. Enter a number that starts with +20. | يعمل FeenGo حاليًا مع أرقام الهواتف المحمولة المصرية فقط. يُرجى إدخال رقم يبدأ بـ +20. | Depends on Q7 and the `auth.otp.allowed_country_codes` setting. If more countries are allowed later, this copy changes. |
| `auth.phone.error.resendTooSoon` | We sent a code to this number a moment ago. You can ask for a new one in {duration}. | أرسلنا رمزًا إلى هذا الرقم قبل قليل. يمكن طلب رمز جديد بعد {duration}. | |
| `auth.phone.action.enterCode` | Enter the code | إدخال الرمز | Banner action |
| `auth.phone.error.rateLimited` | Too many code requests. Try again in {duration}. | طلبات رموز كثيرة جدًا. يُرجى المحاولة مرة أخرى بعد {duration}. | For `RATE_LIMITED` here, more specific than the shared message |
| `error.OTP_LOCKED` | Too many wrong codes for this number. To protect the account, sign-in with it is paused. Try again in {duration}. | تم إدخال رموز خاطئة عدة مرات لهذا الرقم. لحماية الحساب، تم إيقاف تسجيل الدخول به مؤقتًا. يُرجى المحاولة مرة أخرى بعد {duration}. | Shared with code entry |
| `error.OTP_DELIVERY_FAILED` | We couldn't send the code by WhatsApp or SMS. Check the number and try again. | تعذّر إرسال الرمز عبر واتساب أو برسالة نصية. يُرجى التحقق من الرقم والمحاولة مرة أخرى. | |

"WhatsApp" is written واتساب in Arabic, see the glossary.

## Right-to-left notes

**Mirrors in Arabic**

- The column alignment: title, explanation, label, helper text and messages align to the right.
- The close button (option A) sits at the top right.
- The error icon sits at the start of each message, on the right.

**Does not mirror**

- The phone field's content. "+20" (or the country button) stays at the **left** of the number, and the digits run left to right. The field's text aligns left in both languages, because it is a number. The label and helper above and below it still align right.
- The example number in the helper text, inserted as a left-to-right isolate.
- "FeenGo" inside Arabic text.

## Interactions

| Action | Result |
| --- | --- |
| Type or paste a number | Digits in either set are accepted and shown in the chosen digit set, grouped. Leading 0, "+20" and "0020" are removed. Other characters are ignored. |
| Tap "Send code", or the keyboard's done key | Client check, then `POST /v1/auth/otp/request` with the E.164 number, the installation ID, the app's current language and `channel: auto` |
| `202` | Code entry slides in from the end side (the right in English, the left in Arabic), as a standard forward navigation |
| Tap a legal link | Opens that legal page. The number typed stays when the person returns. |
| Close (option A) or "Continue without an account" (option B) | Leaves the flow, back to `from` (option A) or Home (option B). Nothing is sent. |
| System back (Android) or swipe back (iOS) | Same as close. In option B at first launch, same as "Continue without an account". |

The code is sent in the app's current language, so the WhatsApp or SMS message matches the screen (C-03). No analytics event is sent from this screen. The sign-up or login event is sent from code entry (Q-06).

**Testers (Q20).** If S1 goes to external testers, Apple's review needs a demo sign-in. If it is an allow-listed number with a fixed code (to be designed, `docs/ARCHITECTURE.md` section 7.3), this screen does not change.

## Accessibility

- **Title** is a heading and is read first.
- **The field** is announced with its label, its prefix ("Egypt, plus 20") and its helper text. A field message is tied to the field and announced when it appears.
- **Banners** are announced when they appear (live region), once.
- **Focus order:** close (option A), title, explanation, banner if any, phone field (country button first under Q7 no), "Send code", "Continue without an account" (option B), terms, privacy.
- **Touch targets:** close, buttons, the country button and each legal link are at least 44 by 44 points. The legal links are padded to meet this even though the text is small.
- **Largest text size:** nothing is cut off. The title and explanation wrap. The terms line wraps. The prefix stays on the same line as the number when possible, and wraps above it only when the number cannot fit.
- **Keyboard and switch access:** every control can be reached. The focus ring follows the S0 rule.
- **Autofill:** the phone's own number hint is offered where the platform supports it.

## Review checklist after the build

Check English and Arabic, light and dark, smallest, default and largest text, on a 360 dp phone and a large phone:

1. "+20" stays at the left of the number in Arabic, and the number reads left to right.
2. Arabic-Indic digits typed on the keyboard are accepted.
3. Every error in the States table shows its own message, with the wait time from the server.
4. The person can always leave without signing in.
