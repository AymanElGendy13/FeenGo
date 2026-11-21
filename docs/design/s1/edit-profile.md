**Draft: needs owner approval**

# S1: Edit profile

| | |
| --- | --- |
| Screen ID | `s1/edit-profile` |
| Product | Customer app (Flutter) |
| Owner of the code | mobile-dev |
| Approved images | None yet |
| Requirements | C-04 |
| API | `GET /v1/me`, `PATCH /v1/me` |
| Waits on | Plan decisions 1, 5, 6. Q8 (whether the name may stay empty). S1-Q2 (what the email is for). |

Shared patterns are in [README.md](README.md).

## Purpose

The customer changes their name and optional email (C-04). The phone number is shown but cannot be changed, because it is how the person signs in and the contract has no way to change it.

This screen needs an account. A visitor who opens it sees the sign-in prompt and returns here after signing in (C-01, `sign-in-prompt.md`).

## Layout, top to bottom

One column, 24 dp side padding, at most 480 dp wide. Scrolls. The save button stays above the keyboard.

| # | Element | Component | Notes |
| --- | --- | --- | --- |
| 1 | Top bar | App bar | Back button at the top start, title "Edit profile" |
| 2 | Inline banner | Inline banner, error | Errors about the whole save |
| 3 | Name field | Text field | Filled with the current name. Helper "Optional" only while no name has ever been saved and Q8 is yes. |
| 4 | Email field | Text field | Filled with the current email, or empty. Helper `profile.edit.email.helper`. |
| 5 | Mobile number | Read-only field | The number, left to right, with a lock icon and the helper `profile.field.phone.helper`. Not focusable for editing, but readable. |
| 6 | "Save" | Primary button | Disabled until something changes |

## States

| State | Cause | What the person sees |
| --- | --- | --- |
| Loading | `GET /v1/me` in flight and nothing in memory | Skeleton of the three fields |
| Ready | `200 Customer` | Fields filled. "Save" disabled. |
| Could not load | `503`, `500`, timeout | `account.loadError` with "Try again", in place of the fields |
| Edited | A field differs from what was loaded | "Save" enabled |
| Name cleared | Name field empty when a name is already saved | Field message `profile.error.name.cannotRemove`. "Save" disabled. The contract does not allow removing a name once set. |
| Name empty, never set | Q8 yes, name still null | Allowed. The name is simply not sent. |
| Name too long | Client check (over 80), or `400 VALIDATION_FAILED` `/name` `TOO_LONG` | Field message `profile.error.name.tooLong` |
| Email not valid | Client check, or `400 VALIDATION_FAILED` `/email` `FORMAT_EMAIL` | Field message `profile.error.email.format` |
| Email too long | `400 VALIDATION_FAILED` `/email` `TOO_LONG` | Field message `profile.error.email.tooLong` |
| Saving | `PATCH` in flight | Button progress, spoken `profile.saving`. Fields read-only. |
| Saved | `200 Customer` | Back to Account. Snackbar `profile.edit.saved`. |
| Session ended | `401` after one failed refresh | Sign-in prompt, "session ended" form. The app keeps the typed values in memory, so after signing in again this screen opens with them filled in and "Save" enabled. |
| Service down | `503`, `500`, timeout on save | Banner with the shared message and "Try again". Typed changes stay. |
| Offline | No connection on save | Banner `common.offline.message`. Typed changes stay. |
| Leaving with changes | Back with unsaved changes | Dialog `profile.edit.discard.*` |
| Largest text | | Fields grow, labels and helpers wrap, the number wraps only at group spaces |

The request sends only changed fields. A cleared email is sent as `email: null`, which removes it. Values are trimmed.

## Text

| Key | English | Arabic (needs owner review) | Notes |
| --- | --- | --- | --- |
| `profile.edit.title` | Edit profile | تعديل الملف الشخصي | Top bar title, heading |
| `profile.field.name.label` | Name | الاسم | Shared with complete profile |
| `profile.field.name.optional` | Optional | اختياري | Q8 yes, name never set |
| `profile.field.email.label` | Email (optional) | البريد الإلكتروني (اختياري) | |
| `profile.edit.email.helper` | Leave empty to remove your email. | يمكن ترك الحقل فارغًا لحذف البريد الإلكتروني. | The purpose line waits on S1-Q2 and goes before this |
| `profile.field.phone.label` | Mobile number | رقم الهاتف المحمول | |
| `profile.field.phone.helper` | You sign in with this number. It can't be changed here. | يُستخدم هذا الرقم لتسجيل الدخول، ولا يمكن تغييره من هنا. | No way to change it exists (see the gap list) |
| `profile.edit.save` | Save | حفظ | |
| `profile.saving` | Saving | جارٍ الحفظ | Spoken |
| `profile.edit.saved` | Profile saved. | تم حفظ الملف الشخصي. | Snackbar |
| `profile.error.name.cannotRemove` | A name can't be removed once added. You can change it instead. | لا يمكن حذف الاسم بعد إضافته، ويمكن تغييره فقط. | |
| `profile.edit.discard.title` | Discard your changes? | تجاهل التغييرات؟ | Dialog |
| `profile.edit.discard.body` | Your changes haven't been saved. | لم يتم حفظ التغييرات. | |
| `profile.edit.discard.confirm` | Discard | تجاهل | |
| `profile.edit.discard.keep` | Keep editing | متابعة التعديل | |

Also used: `profile.error.name.tooLong`, `profile.error.email.format`, `profile.error.email.tooLong` (`complete-profile.md`), `account.loadError`.

## Right-to-left notes

**Mirrors:** labels, helpers and messages align right. The back button sits at the top right. The lock icon sits at the end of the number field.

**Does not mirror:** the email and phone values (left to right, aligned left). The name follows its own script.

## Interactions

| Action | Result |
| --- | --- |
| "Save" | Client checks, then `PATCH /v1/me` with the changed fields |
| Back, system back, swipe back | If nothing changed, back to Account. If something changed, the discard dialog. |
| Tap the mobile number | Nothing. Screen readers read it with its helper. |

## Accessibility

- **Fields** announce label, value, helper and any error. The number is announced as "Mobile number, +20 10 1234 5678, read only. You sign in with this number. It can't be changed here."
- **Focus order:** back, title, banner if any, name, email, mobile number, Save.
- **Touch targets:** back and Save at least 44 by 44 points. Fields at least 48 dp tall.
- **Largest text size:** nothing cut off.
- **Autofill:** name and email declared.

## Review checklist after the build

1. Clearing the email removes it; clearing a saved name is refused with a clear message.
2. Leaving with unsaved changes asks first.
3. The number reads left to right in Arabic and is not editable.
