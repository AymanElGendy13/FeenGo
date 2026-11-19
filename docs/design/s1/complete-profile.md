**Draft: needs owner approval**

# S1: Complete your profile

| | |
| --- | --- |
| Screen ID | `s1/complete-profile` |
| Product | Customer app (Flutter) |
| Owner of the code | mobile-dev |
| Approved images | None yet |
| Requirements | C-04 |
| API | `PATCH /v1/me` |
| Waits on | Plan decisions 1, 6. Q8 (name optional at sign-up). S1-Q2 (what the email is for). |

Shared patterns are in [README.md](README.md).

## Purpose

Asks a new customer for their name, and optionally their email, right after their first sign-in. It appears only when `POST /v1/auth/otp/verify` answers with `isNewCustomer: true`.

| Requirement | How this screen serves it |
| --- | --- |
| C-04 | The customer gives their name and optional email. The same fields are edited later in edit profile. |

### Decision needed: may the name be skipped? (Q8)

| | Q8 yes: name optional (architect's proposal) | Q8 no: name required |
| --- | --- | --- |
| "Skip for now" | Shown | Not shown |
| Name field | Optional. "Save and continue" with an empty name does the same as skip. | Required. "Save and continue" with an empty name shows `profile.error.name.required`. |
| Back or close | Same as skip | Not offered. The screen has no back button. Android system back does nothing. |
| App closed before saving | The prompt is not shown again. Account shows "Add your name". A name becomes required before the first booking in S4. | The account exists already (it was created by the code check), so the prompt is shown again at every launch until a name is saved |
| For | The person reaches what they wanted faster | Venues always see a name from S4 |

## Layout, top to bottom

One column inside the safe area, 24 dp side padding, at most 480 dp wide. Scrolls when needed. The primary button stays above the keyboard.

| # | Element | Component | Notes |
| --- | --- | --- | --- |
| 1 | Top bar | App bar | Q8 yes: "Skip for now" as a text button at the top end. Q8 no: empty. No back button in either case, because the code step cannot be repeated. |
| 2 | Title, "Add your name" | Text, heading, screen title type | |
| 3 | Explanation | Body text | Why the name is asked |
| 4 | Inline banner | Inline banner, error | Errors about the whole save |
| 5 | Name field | Text field | Label "Name" (Q8 no) or "Name" with helper "Optional" (Q8 yes). Focused on opening. Keyboard: text, words capitalised in English. Autofill: name. |
| 6 | Email field | Text field | Label "Email (optional)". Keyboard: email. Autofill: email. Helper text waits on S1-Q2. |
| 7 | "Save and continue" | Primary button | 24 dp below the fields |

## States

| State | Cause | What the person sees |
| --- | --- | --- |
| Empty | Screen opens | Both fields empty, name focused |
| Name empty on save | Client check, Q8 no | Field message `profile.error.name.required` |
| Name too long | Client check (more than 80 characters), or `400 VALIDATION_FAILED` with `/name` `TOO_LONG` | Field message `profile.error.name.tooLong` |
| Email not valid | Client check, or `400 VALIDATION_FAILED` with `/email` `FORMAT_EMAIL` | Field message `profile.error.email.format` |
| Email too long | `400 VALIDATION_FAILED` with `/email` `TOO_LONG` | Field message `profile.error.email.tooLong` |
| Saving | `PATCH` in flight | Button progress, spoken `profile.saving`. Fields read-only. |
| Saved | `200 Customer` | The flow closes and the app returns to `from`. Snackbar `profile.complete.saved`. |
| Nothing to save | Both fields empty, Q8 yes | No request (the contract refuses an empty body). Same as skip. |
| Session ended | `401 UNAUTHENTICATED` after one failed refresh | Signed out. The sign-in prompt appears in its "session ended" form (`sign-in-prompt.md`). |
| Service down | `503`, `500`, timeout | Banner with the shared message and "Try again". What was typed stays. |
| Offline | No connection on save | Banner `common.offline.message`. What was typed stays. |
| Largest text | | Column scrolls. Labels and helpers wrap. |

The request sends only fields that have a value: `name` trimmed, `email` trimmed. An empty email is not sent here (there is nothing to remove yet).

## Text

| Key | English | Arabic (needs owner review) | Notes |
| --- | --- | --- | --- |
| `profile.complete.title` | Add your name | إضافة الاسم | Heading |
| `profile.complete.body` | Venues will see this name when you book. | سيظهر هذا الاسم للأماكن عند الحجز. | True from S4. Shown in S1 so the purpose is clear. |
| `profile.field.name.label` | Name | الاسم | |
| `profile.field.name.optional` | Optional | اختياري | Helper under the name field, Q8 yes only |
| `profile.field.email.label` | Email (optional) | البريد الإلكتروني (اختياري) | |
| `profile.field.email.helper` | No copy until S1-Q2 is answered | | Must say what the email is for |
| `profile.complete.save` | Save and continue | حفظ ومتابعة | Primary button |
| `profile.complete.skip` | Skip for now | تخطٍّ الآن | Q8 yes only |
| `profile.saving` | Saving | جارٍ الحفظ | Spoken |
| `profile.complete.saved` | Welcome to FeenGo. | مرحبًا بك في FeenGo. | Snackbar. "بك" is gendered when spoken; alternative "أهلًا وسهلًا في FeenGo." for review. |
| `profile.error.name.required` | Enter a name to continue. | يُرجى إدخال الاسم للمتابعة. | Q8 no |
| `profile.error.name.tooLong` | Use {max} characters or fewer. | يُرجى ألا يزيد الاسم على {max} حرفًا. | `{max}` is 80, from the contract |
| `profile.error.email.format` | Enter an email address like name@example.com. | يُرجى إدخال بريد إلكتروني صحيح، مثل name@example.com. | The example is a left-to-right isolate |
| `profile.error.email.tooLong` | This email is too long. Use {max} characters or fewer. | هذا البريد الإلكتروني طويل جدًا. يُرجى ألا يزيد على {max} حرفًا. | `{max}` is 254 |

## Right-to-left notes

**Mirrors in Arabic:** text alignment, "Skip for now" at the top left, field labels and messages on the right.

**Does not mirror:** the email field's content is always left to right and aligned left, because addresses are Latin. The name field follows the text typed: an Arabic name runs right to left, a Latin name left to right (the field uses the direction of its first strong character).

## Interactions

| Action | Result |
| --- | --- |
| "Save and continue" | Client check, then `PATCH /v1/me` with the fields that have a value |
| Keyboard "next" on name | Moves to email. "Done" on email saves. |
| "Skip for now" (Q8 yes) | Closes the flow and returns to `from`. Nothing is sent. |
| Android system back | Q8 yes: same as skip. Q8 no: nothing happens. |

## Accessibility

- **Title** is a heading. The explanation is read after it.
- **Fields** are announced with their label, helper ("Optional") and any error.
- **Focus order:** "Skip for now" (Q8 yes), title, explanation, banner if any, name, email, "Save and continue".
- **Touch targets:** at least 44 by 44 points for "Skip for now" and the button. Fields at least 48 dp tall.
- **Largest text size:** nothing cut off. "Skip for now" stays in the bar; if it does not fit, it moves under the primary button as a text button.
- **Autofill** for name and email is declared.

## Review checklist after the build

1. A new account sees this screen once; an existing account never does.
2. The behaviour matches the owner's answer to Q8.
3. A Latin email inside the Arabic layout reads left to right.
