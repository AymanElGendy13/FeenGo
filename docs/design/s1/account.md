**Draft: needs owner approval**

# S1: Account

| | |
| --- | --- |
| Screen ID | `s1/account` |
| Product | Customer app (Flutter) |
| Owner of the code | mobile-dev |
| Approved images | None yet |
| Requirements | C-04, C-03 |
| API | `GET /v1/me`, `POST /v1/auth/logout` |
| Waits on | Plan decisions 1, 3 (appearance row), 5, 6, 8 (where Account lives). |

Shared patterns are in [README.md](README.md).

## Purpose

The one place for everything about the person and the app: their profile, language, legal pages, signing out and deleting the account. Visitors can open it too, because the language setting must be reachable without an account (C-03), and it is where they choose to sign in.

| Requirement | How this screen serves it |
| --- | --- |
| C-04 | Shows the profile, leads to edit profile and delete account |
| C-03 | Leads to the language setting, for visitors and customers |

Later slices add rows here: payments (S6), referral code and help (S7), as `docs/design/plan.md` section 3 lists.

### Decision needed: where Account lives (plan decision 8)

| | Option 1: button in the Home header (recommended in plan.md) | Option 2: two-tab bar from S1 |
| --- | --- | --- |
| Entry | An Account button at the top end of the Home header: a person icon with the visible label "Account" | A bottom tab bar with Home and Account |
| This screen's top bar | Back button at the top start, title "Account" | Title "Account", no back button. The tab bar shows below. |
| Back from here | Back to Home | Switching tabs. System back on Android goes to Home, then leaves the app. |
| From S3 | The tab bar arrives with Home, Search and Account; this screen becomes the Account tab | Search joins the bar |
| Placeholder home change | Adds the header button. Removes the language control (moved to the language setting). | Adds the tab bar. Removes the language control. |

The content below is the same under both options.

## Layout, top to bottom

A scrolling list inside the safe area. Rows are full width with 24 dp start and end padding. Sections have a small heading.

### Signed in

| # | Element | Component | Notes |
| --- | --- | --- | --- |
| 1 | Top bar | App bar | See the decision above |
| 2 | Profile summary | Card, not tappable | Name (title type), or "Add your name" as a link when the name is empty. Phone number under it, left to right. Email under that, if any. |
| 3 | "Edit profile" | List row with chevron | |
| 4 | Section heading "Settings" | Text, heading | |
| 5 | "Language" | List row with value and chevron | The value is the current language in its own script: "English" or "العربية" |
| 6 | "Appearance" | List row with value and chevron | **Only if plan decision 3 is yes.** Value: "Phone setting", "Light" or "Dark". |
| 7 | Section heading "About" | Text, heading | |
| 8 | "Terms of use" | List row with chevron | |
| 9 | "Privacy policy" | List row with chevron | |
| 10 | "Sign out" | List row, no chevron | Text in the normal colour, not red. It is not destructive. |
| 11 | "Delete account" | List row with chevron | Error colour text and an icon, so it is not shown by colour alone. Separated by 24 dp from "Sign out". |
| 12 | App version | Caption, centred | "Version 0.1.0 (1)". Helps testers report problems. |

### Visitor

| # | Element | Component | Notes |
| --- | --- | --- | --- |
| 1 | Top bar | App bar | As above |
| 2 | Notice | Inline banner, information | Only right after a session ended: `account.sessionEnded`. Disappears when the person leaves the screen. |
| 3 | Sign-in card | Card | Title "You're browsing as a guest", explanation, primary button "Sign in" |
| 4 to 9 | Settings and About sections | As signed in | Same rows: Language, Appearance (decision 3), Terms, Privacy |
| 10 | App version | Caption | |

Visitors see no "Edit profile", "Sign out" or "Delete account".

## States

| State | Cause | What the person sees |
| --- | --- | --- |
| Visitor | No session | Visitor layout |
| Loading profile | Signed in, `GET /v1/me` in flight, nothing cached | Skeleton of the profile card. Rows below work at once. |
| Profile shown | `200 Customer` | Signed-in layout. The profile is kept in memory for this run, so returning to the screen shows it at once and refreshes quietly. |
| Name empty | `name` is null (Q8 yes, skipped) | "Add your name" link in place of the name |
| Profile could not load | `503`, `500`, timeout | The card shows `account.loadError` and "Try again". The rest of the screen works, including sign out and delete account. |
| Offline, signed in | No connection | The card shows the last profile from this run, or `common.offline.message` if there is none. Sign out still works (see Interactions). |
| Session ended | `401` after one failed refresh, or refresh `REFRESH_TOKEN_INVALID` or `REFRESH_TOKEN_REUSED` | Visitor layout with the notice `account.sessionEnded` |
| Account suspended | `403 ACCOUNT_SUSPENDED` (from S2) | Signed out. Alert dialog with `error.ACCOUNT_SUSPENDED`. Then the visitor layout. |
| Signing out | `POST /v1/auth/logout` in flight | Progress in the dialog's "Sign out" button |
| Signed out | `204`, or `401` (already ended) | Visitor layout. Snackbar `account.signedOut`. |
| Largest text | | Rows grow in height. Row values move under the row title when they do not fit beside it. The phone number wraps only at group spaces. |

## Text

| Key | English | Arabic (needs owner review) | Notes |
| --- | --- | --- | --- |
| `account.title` | Account | الحساب | Top bar title, and the Home header button's label (option 1) or the tab label (option 2) |
| `account.addName` | Add your name | إضافة الاسم | Link in the profile card |
| `account.row.editProfile` | Edit profile | تعديل الملف الشخصي | |
| `account.section.settings` | Settings | الإعدادات | |
| `settings.language.title` | Language | اللغة | Existing key from S0 |
| `settings.appearance.title` | Appearance | المظهر | Decision 3 |
| `account.section.about` | About | حول التطبيق | |
| `legal.terms.title` | Terms of use | شروط الاستخدام | |
| `legal.privacy.title` | Privacy policy | سياسة الخصوصية | |
| `account.row.signOut` | Sign out | تسجيل الخروج | |
| `account.row.delete` | Delete account | حذف الحساب | |
| `account.version` | Version {version} | الإصدار {version} | `{version}` left to right |
| `account.visitor.title` | You're browsing as a guest | التصفح بدون حساب | Arabic avoids "زائر", which is masculine |
| `account.visitor.body` | Sign in or create an account with your mobile number. | يمكن تسجيل الدخول أو إنشاء حساب برقم الهاتف المحمول. | S3 and S4 may extend this with what an account is for |
| `account.visitor.action` | Sign in | تسجيل الدخول | Primary |
| `account.sessionEnded` | You've been signed out. Sign in again to see your profile. | تم تسجيل الخروج. يُرجى تسجيل الدخول مرة أخرى لعرض الملف الشخصي. | |
| `account.loadError` | Your profile couldn't load. | تعذّر تحميل الملف الشخصي. | Followed by "Try again" |
| `account.signOut.confirm.title` | Sign out of FeenGo? | تسجيل الخروج من FeenGo؟ | Dialog |
| `account.signOut.confirm.body` | You can sign in again any time with your mobile number. | يمكن تسجيل الدخول مرة أخرى في أي وقت برقم الهاتف المحمول. | |
| `account.signOut.confirm.action` | Sign out | تسجيل الخروج | Dialog confirm |
| `account.signedOut` | You've signed out. | تم تسجيل الخروج. | Snackbar |

## Right-to-left notes

**Mirrors:** text alignment, row titles on the right and values and chevrons on the left, the chevron glyph points left, the back button (option 1) at the top right with its arrow pointing right, the Account button (option 1) at the top left of Home, the tab order (option 2: Home at the far right).

**Does not mirror:** the phone number, the email, the version number, "FeenGo". The language value "English" stays in Latin script and "العربية" in Arabic script in both languages.

## Interactions

| Action | Result |
| --- | --- |
| "Sign in" (visitor) | Phone entry, with `from` = Account. After sign-in, back here in the signed-in layout. |
| "Add your name" | Edit profile with the name field focused |
| "Edit profile" | Edit profile |
| "Language" | Language setting |
| "Appearance" | Appearance setting (decision 3) |
| "Terms of use", "Privacy policy" | Legal pages |
| "Sign out" | Confirmation dialog. "Sign out" in the dialog sends `POST /v1/auth/logout`. On `204` or `401`, the app deletes its tokens and shows the visitor layout. If the call fails or the phone is offline, the app still deletes its tokens and signs out locally; the server session ends on its own when it expires. |
| "Delete account" | Delete account |
| Sign out, analytics | No event. Signing out does not reset analytics; deleting the account does. |

Signing out keeps the language choice and the installation ID on the phone.

## Accessibility

- **Top bar title** is a heading, and so are the section headings.
- **Profile card** is read as one group: "Salma Hassan, +20 10 1234 5678, salma@example.com".
- **Rows** are announced as buttons with their value: "Language, English, button".
- **"Delete account"** is announced with its words only; the colour and icon are not the only signal.
- **Focus order:** top bar, profile card or sign-in card, rows top to bottom, version.
- **Touch targets:** the back button (option 1) is at least 44 by 44 points. Every row is at least 48 dp tall and full width.
- **Largest text size:** nothing cut off; values wrap under titles.

## Review checklist after the build

1. A visitor can reach the language setting without signing in.
2. "Sign in" from here returns here, signed in.
3. Signing out with no connection still signs out.
4. "Delete account" is distinct without colour (check in greyscale).
