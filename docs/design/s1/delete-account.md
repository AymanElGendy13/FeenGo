**Draft: needs owner approval**

# S1: Delete account

| | |
| --- | --- |
| Screen ID | `s1/delete-account` |
| Product | Customer app (Flutter) |
| Owner of the code | mobile-dev |
| Approved images | None yet |
| Requirements | C-04, Q-07 |
| API | `DELETE /v1/me`. When it answers `REAUTH_REQUIRED`: `POST /v1/auth/otp/request` and `POST /v1/auth/otp/verify` (code entry, confirm mode). |
| Waits on | Plan decisions 1, 5, 6. **Q5** (the deletion proposal, with a lawyer: what is deleted, what is kept, and the "signed in within 10 minutes" rule). |

Shared patterns are in [README.md](README.md).

## Purpose

The customer deletes their account from inside the app, as Apple and Google require (Q-07). The screen says plainly what is deleted, what is kept, and that it cannot be undone, then asks once more before deleting.

The architecture proposes that a deletion needs a recent sign-in (`auth.account_deletion.reauth_window_minutes`, default 10). If the last sign-in is older, the API answers `REAUTH_REQUIRED` and the person confirms it is them with a new code. This stops someone holding an unlocked phone from deleting the account.

| Requirement | How this screen serves it |
| --- | --- |
| C-04 | The customer can delete their account from inside the app |
| Q-07 | Deletion works inside the app, with no email or web form |

**Q5.** What is deleted and kept, and the recent sign-in rule, are a proposal awaiting the owner and a lawyer. The copy below follows the proposal in `docs/ARCHITECTURE.md` section 10. If the answer changes it, only the "What we keep" text and the confirm step change.

This screen needs an account (route guard, `sign-in-prompt.md`).

## Layout, top to bottom

One column, 24 dp side padding, at most 480 dp wide. Scrolls.

| # | Element | Component | Notes |
| --- | --- | --- | --- |
| 1 | Top bar | App bar | Back button at the top start, title "Delete account" |
| 2 | Warning | Body text, emphasised | "Deleting your account can't be undone." With a warning icon at the start. |
| 3 | Inline banner | Inline banner, error | Errors from deleting or from sending the confirmation code |
| 4 | "What we delete" | Section heading and a bulleted list | Name, number and email. Signed out on every phone. |
| 5 | "What we keep" | Section heading and a bulleted list | Records of past bookings and payments without personal details. Waits on Q5. |
| 6 | Signing up again | Body text | The same number can make a new, empty account later |
| 7 | "Delete my account" | Destructive button | Full width, 32 dp below the text |
| 8 | "Keep my account" | Text button | Full width, under it. Same as back. |

### Confirmation dialog

| Element | Content |
| --- | --- |
| Title | "Delete your account?" |
| Body | "This can't be undone." |
| Actions | "Cancel" and "Delete" (destructive style). On iOS, "Delete" is the destructive action of an alert. On Android, the actions are in the platform order. "Cancel" has the default focus. |

### "Confirm it's you" dialog

Shown when `DELETE /v1/me` answers `403 REAUTH_REQUIRED`.

| Element | Content |
| --- | --- |
| Title | "Confirm it's you" |
| Body | "For your security, we'll send a code to {phone} before deleting your account." The number is the account's own, left to right. |
| Actions | "Cancel" and "Send code" |

## States

| State | Cause | What the person sees |
| --- | --- | --- |
| Ready | Screen opens | The explanation and the two buttons |
| Asking | "Delete my account" tapped | Confirmation dialog |
| Deleting | "Delete" in the dialog, `DELETE /v1/me` in flight | Full-screen progress over this screen, spoken `account.delete.deleting`. Back is disabled. |
| Deleted | `204` | Account deleted screen replaces this one. The app deletes its tokens and resets analytics (`docs/ARCHITECTURE.md` section 10, step 5). |
| Recent sign-in needed | `403 REAUTH_REQUIRED` | "Confirm it's you" dialog |
| Sending the code | "Send code", `POST /v1/auth/otp/request` with the account's phone, `channel: auto` | Progress in the dialog's button |
| Code sent | `202` | Code entry in confirm mode. After a correct code, back here; the app deletes at once with the new session (Deleting row). |
| Confirm abandoned | Back from code entry | This screen, nothing deleted |
| Code request refused | `423 OTP_LOCKED`, `429 OTP_RESEND_TOO_SOON`, `429 RATE_LIMITED`, `503 OTP_DELIVERY_FAILED` | The dialog closes. Banner with the same message as on phone entry for that code. For `OTP_RESEND_TOO_SOON`, if the app still holds a challenge for this number, code entry opens instead. |
| Too many deletions tried | `429 RATE_LIMITED` from `DELETE` | Banner `error.RATE_LIMITED` with the wait |
| Still needs a recent sign-in after confirming | `403 REAUTH_REQUIRED` again, right after a correct code | Banner `account.delete.error.reauthAgain`. Reported to crash reporting, because this should not happen. |
| Session ended | `401` after one failed refresh | Sign-in prompt, "session ended" form. After signing in, back here, nothing deleted. |
| Service down | `503`, `500`, timeout | Banner with the shared message. "Delete my account" works again. A timeout may mean the deletion happened, so the app then calls `GET /v1/me`. `200`: not deleted; the banner stays and the person can try again. `401` after one failed refresh: **this does not prove deletion**, because a refresh also fails with `REFRESH_TOKEN_INVALID` when the session expired, was ended, or the server lost its cached successor. The app signs out locally, remembers the unsure deletion on the phone (see "Unsure deletion" below) and shows the dialog `account.delete.unsure` instead of the account deleted screen. Only a `204` leads to the account deleted screen. (No endpoint reports whether an account was deleted; gap G17.) |
| Unsure deletion: deleted, new account made by this sign-in | Next sign-in with the remembered number answers `isNewCustomer: true` | Dialog `account.delete.unsure.wasDeleted` with `.body`, before complete profile. "Delete new account" opens this screen for the new account; "Keep new account" continues to complete profile. |
| Unsure deletion: deleted, number signed up again elsewhere | `isNewCustomer: false`, and `customer.createdAt` is later than the stored request time | Dialog `account.delete.unsure.wasDeleted` with `account.delete.unsure.wasDeleted.bodyElsewhere`. Same two actions; "Keep new account" continues to `from`. |
| Unsure deletion: not deleted | `isNewCustomer: false`, and `customer.createdAt` is earlier than the stored request time | This screen opens at once, with the information banner `account.delete.unsure.notDeleted`. The person can delete or keep the account as usual. |
| Offline | No connection on "Delete" | Banner `common.offline.message`. Nothing sent. |
| Largest text | | Scrolls. Dialogs scroll inside. Buttons stack. |

## Text

| Key | English | Arabic (needs owner review) | Notes |
| --- | --- | --- | --- |
| `account.delete.title` | Delete account | حذف الحساب | Heading |
| `account.delete.warning` | Deleting your account can't be undone. | لا يمكن التراجع عن حذف الحساب. | |
| `account.delete.removed.heading` | What we delete | ما سيتم حذفه | |
| `account.delete.removed.details` | Your name, mobile number and email | الاسم ورقم الهاتف المحمول والبريد الإلكتروني | List item |
| `account.delete.removed.sessions` | You'll be signed out on every phone | تسجيل الخروج من جميع الهواتف | List item |
| `account.delete.kept.heading` | What we keep | ما سيتم الاحتفاظ به | Waits on Q5 |
| `account.delete.kept.records` | Records of past bookings and payments, without your name or number. Venues and our accounts need them. | سجلات الحجوزات والمدفوعات السابقة، دون الاسم أو الرقم، لأن الأماكن وحساباتنا تحتاج إليها. | Waits on Q5 and a lawyer. True from S4 and S6. In S1 there are none. |
| `account.delete.again` | You can create a new account with the same number later. It will start empty. | يمكن إنشاء حساب جديد بالرقم نفسه لاحقًا، وسيبدأ فارغًا. | |
| `account.delete.action` | Delete my account | حذف الحساب نهائيًا | Destructive button. Arabic avoids "my": "delete the account permanently". |
| `account.delete.keep` | Keep my account | الاحتفاظ بالحساب | |
| `account.delete.confirm.title` | Delete your account? | حذف الحساب؟ | Dialog |
| `account.delete.confirm.body` | This can't be undone. | لا يمكن التراجع عن ذلك. | |
| `account.delete.confirm.action` | Delete | حذف | |
| `account.delete.reauth.title` | Confirm it's you | تأكيد الهوية | Dialog |
| `account.delete.reauth.body` | For your security, we'll send a code to {phone} before deleting your account. | للحماية، سنرسل رمزًا إلى {phone} قبل حذف الحساب. | `{phone}` left-to-right isolate |
| `account.delete.reauth.action` | Send code | إرسال الرمز | |
| `account.delete.deleting` | Deleting your account | جارٍ حذف الحساب | Spoken |
| `account.delete.error.reauthAgain` | We couldn't confirm it's you. Try deleting again. | تعذّر تأكيد الهوية. يُرجى محاولة الحذف مرة أخرى. | |
| `account.delete.unsure` | We couldn't confirm that your account was deleted, and you've been signed out. The next time you sign in with this number, we'll tell you whether it was deleted. | تعذّر التأكد من حذف الحساب، وتم تسجيل الخروج. عند تسجيل الدخول التالي بهذا الرقم، سنوضّح ما إذا كان الحساب قد حُذف. | Dialog, with "OK". Rare. |
| `account.delete.unsure.wasDeleted.title` | Your earlier account was deleted | تم حذف الحساب السابق | Dialog title |
| `account.delete.unsure.wasDeleted.body` | Signing in just now created a new, empty account with this number. You can keep it or delete it. | أدى تسجيل الدخول الآن إلى إنشاء حساب جديد فارغ بهذا الرقم. يمكن الاحتفاظ به أو حذفه. | |
| `account.delete.unsure.wasDeleted.delete` | Delete new account | حذف الحساب الجديد | Dialog action |
| `account.delete.unsure.wasDeleted.keep` | Keep new account | الاحتفاظ بالحساب الجديد | Dialog action, the default |
| `account.delete.unsure.wasDeleted.bodyElsewhere` | This number now has a newer account, created after your deletion request, for example on another phone. You can keep it or delete it. | يوجد الآن حساب أحدث بهذا الرقم، أُنشئ بعد طلب الحذف، مثلًا من هاتف آخر. يمكن الاحتفاظ به أو حذفه. | Dialog body, created-elsewhere case |
| `account.delete.unsure.notDeleted` | We couldn't confirm that your earlier deletion went through, and this account was created before it. You can delete it now. | تعذّر التأكد من إتمام طلب الحذف السابق، وقد أُنشئ هذا الحساب قبله. يمكن حذفه الآن. | Information banner on this screen. Says "couldn't confirm", because the comparison depends on the phone's clock. |
| `error.REAUTH_REQUIRED` | Confirm it's you first. | يُرجى تأكيد الهوية أولًا. | Fallback only. Normally the dialog handles this code. |

## Unsure deletion

After a timed-out `DELETE /v1/me`, the app cannot tell whether the account was deleted, and an empty-looking profile proves nothing: an account that was never deleted can also have no name or email. The next sign-in answers the question, because `isNewCustomer` says whether the account existed.

- The app keeps an "unsure deletion" record in secure storage on the phone. It holds three things:
  - **a keyed hash of the account's E.164 number**, never the number itself: HMAC-SHA-256 with a random key made for this record and kept beside it in secure storage. Matching needs nothing more. Phone numbers are easy to guess, so this keeps the number out of plain sight rather than making it unrecoverable;
  - **the time the timed-out `DELETE /v1/me` was sent**, by the phone's clock;
  - **an expiry**: the `refreshTokenExpiresAt` of the session the app held at that moment, which follows the customer refresh-token lifetime (`CUSTOMER_REFRESH_TTL_DAYS`, 60 days by default, security configuration and not a business rule). The app checks the expiry at each launch and deletes an expired record, and then shows nothing.
- At the next successful sign-in with a number whose hash matches, the app decides from `POST /v1/auth/otp/verify`:
  - **deleted** if `isNewCustomer` is true, or if `customer.createdAt` (in the contract's `Customer` schema) is later than the stored request time, which means the number signed up again elsewhere;
  - **not deleted** otherwise;
  - then acts as in the three "Unsure deletion" rows above and deletes the record.
- The comparison uses the phone's clock for the stored time and the server's for `createdAt`. A badly wrong phone clock could mislead it, which is why the "not deleted" banner says "couldn't confirm" (related to gap G11).
- A sign-in with a different number leaves the record in place. Uninstalling the app removes it.
- The flow is shown once. It never reruns on later sign-ins.

## Right-to-left notes

**Mirrors:** text and bullets align right, the warning icon is at the start (right), the back button is at the top right.

**Does not mirror:** the phone number in the dialog. The warning icon glyph itself.

## Interactions

| Action | Result |
| --- | --- |
| "Delete my account" | Confirmation dialog |
| "Delete" in the dialog | `DELETE /v1/me` |
| "Cancel" in either dialog, "Keep my account", back | Nothing is deleted. Dialogs close; "Keep my account" and back return to Account. |
| "Send code" | Code request, then code entry in confirm mode |
| Correct code in confirm mode | The app keeps the new session's tokens, comes back here, and sends `DELETE /v1/me` at once without asking again, because the person already confirmed |

The person confirms once (the dialog), and proves it is them only when the server asks. They are never asked to confirm twice.

## Accessibility

- **Title** and the two section headings are headings.
- **The warning** is read first after the title.
- **Dialogs** take focus on their title, are announced as alerts, and return focus to "Delete my account" when cancelled. "Cancel" is the default action, so pressing enter or the hardware back key never deletes.
- **"Delete my account"** is announced by its words. The destructive colour is not the only signal: the label says what it does.
- **Focus order:** back, title, warning, banner if any, "What we delete" and its items, "What we keep" and its items, the sign-up line, "Delete my account", "Keep my account".
- **Touch targets:** the back button is at least 44 by 44 points. Buttons are at least 48 dp tall and full width.
- **Largest text size:** nothing cut off, dialogs scroll.

## Review checklist after the build

1. Deleting within the recent sign-in window needs one confirmation and no code.
2. Deleting later needs the dialog, then a code, then deletes without a second confirmation.
3. After deletion, every other phone signed in to the account is signed out.
4. Cancelling at any step deletes nothing.
