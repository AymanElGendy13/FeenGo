**Draft: needs owner approval**

# S1: Admin shell (header, sidebar and empty home)

| | |
| --- | --- |
| Screen ID | `s1/admin-shell` |
| Product | Admin back office (Next.js). The frame around every signed-in admin page, and the home page `/`. |
| Owner of the code | web-dev |
| Approved images | None yet |
| Requirements | A-01 (no admin page without both sign-in steps) |
| API | `GET /v1/admin/me` (Q15), `POST /session/sign-out` |
| Waits on | Plan decisions 1, 6, 7 (the Arabic product name). **Q15** (whether `GET /v1/admin/me` exists, which decides whether the header shows the admin's name). The full admin navigation is approved before S2 (`plan.md` section 4). |

Shared patterns are in [README.md](README.md).

## Purpose

The frame every admin page sits in: who is signed in, where to go, how to sign out, and the language. In S1 it holds only the home page and the activity log. Each later slice adds its own sidebar items (`docs/design/plan.md` section 3).

## Layout

Desktop first. A header across the top, a sidebar on the start side (left in English, right in Arabic), and the page content.

### Header, 64 px tall

| Position | Element | Notes |
| --- | --- | --- |
| Start | "Skip to content" link | Hidden until focused. The first focus stop on every page. |
| Start | Product name "FeenGo Admin", links to home | `admin.app.name`. A temporary mark until the logo exists. |
| End | Environment badge | "Staging" or "Development" on those environments, so nobody mistakes them for production. None on production. Text plus colour. |
| End | Language control | "English" and "العربية" |
| End | Admin menu button | Shows the admin's name (Q15 yes) or "Account" (Q15 no). Opens a menu with the admin's email (Q15 yes) and "Sign out". |

### Sidebar, 240 px wide

| Item | Path | Slice |
| --- | --- | --- |
| Home | `/` | S1, metrics in S7 |
| Activity log | `/activity-log` | S1 |

The current page's item is marked with a filled background, a bar at the start edge and `aria-current="page"`, so it is not shown by colour alone. Later slices add Approvals, Venues, Customers, Bookings, Reviews, Featured, Settings, Lists and Agreements, in the order in `plan.md` section 3, only when they have content. An empty item is never shown.

Under 1024 px wide, the sidebar collapses behind a menu button at the start of the header and opens as a drawer from the start side.

### Home content

| # | Element | Notes |
| --- | --- | --- |
| 1 | Heading level 1, "Welcome, {name}" (Q15 yes) or "Welcome" (Q15 no) | |
| 2 | Body text | Says the back office grows with each release, and points to the activity log |
| 3 | Link "Open the activity log" | |

## States

| State | Cause | What the admin sees |
| --- | --- | --- |
| Signed in | Both steps done, `GET /v1/admin/me` `200 AdminUser` | Full shell with the name |
| Name unavailable | Q15 no, or `GET /v1/admin/me` fails with `503` or `500` | "Account" in place of the name, "Welcome" without a name. The page still works. |
| Session ended | `401` from `GET /v1/admin/me` or any API call, after one refresh | Redirect to sign-in with the "session ended" notice (`admin-signed-out.md`) |
| Second step missing | `403 MFA_REQUIRED` | Redirect to sign-in. Should never happen, because `proxy.ts` checks `amr` first. |
| Disabled | `403 ADMIN_DISABLED` on refresh | Redirect to sign-in with the disabled message |
| Signing out | "Sign out" chosen | Menu item shows progress; then redirect to sign-in with the "signed out" notice |
| Narrow screen or 200% zoom | | Sidebar becomes a drawer. Header items that do not fit move into the admin menu (language last). Nothing is cut off. |

## Text

| Key | English | Arabic (needs owner review) | Notes |
| --- | --- | --- | --- |
| `admin.app.name` | FeenGo Admin | إدارة FeenGo | Existing key, waits on plan decision 7 |
| `admin.skipToContent` | Skip to content | الانتقال إلى المحتوى | |
| `admin.env.staging` | Staging | بيئة الاختبار | Badge |
| `admin.env.development` | Development | بيئة التطوير | Badge |
| `admin.nav.label` | Main | القائمة الرئيسية | Spoken name of the sidebar `<nav>` |
| `admin.nav.open` | Open menu | فتح القائمة | Narrow screens |
| `admin.nav.close` | Close menu | إغلاق القائمة | |
| `admin.nav.home` | Home | الرئيسية | |
| `admin.nav.activityLog` | Activity log | سجل النشاط | |
| `admin.menu.account` | Account | الحساب | Menu button when no name (Q15 no) |
| `admin.menu.signedInAs` | Signed in as {email} | تم تسجيل الدخول باسم {email} | Inside the menu, Q15 yes. `{email}` left to right. |
| `admin.menu.signOut` | Sign out | تسجيل الخروج | |
| `admin.home.titleNamed` | Welcome, {name} | مرحبًا، {name} | Q15 yes |
| `admin.home.title` | Welcome | مرحبًا | Q15 no |
| `admin.home.pageTitle` | Home · FeenGo Admin | الرئيسية · إدارة FeenGo | Browser tab |
| `admin.home.body` | More tools arrive with each release. For now, you can review every admin action in the activity log. | ستُضاف أدوات أخرى مع كل إصدار. يمكن حاليًا مراجعة جميع إجراءات الإدارة في سجل النشاط. | |
| `admin.home.openLog` | Open the activity log | فتح سجل النشاط | |

## Right-to-left notes

**Mirrors:** the sidebar is on the right in Arabic, the drawer opens from the right, the skip link and product name are at the right of the header, the language control and admin menu at the left. The current-item bar is on the start edge.

**Does not mirror:** the admin's email, "FeenGo" inside the product name.

## Interactions

| Action | Result |
| --- | --- |
| Sidebar item | Opens that page. Client-side navigation is still checked by `proxy.ts` (A-01). |
| Admin menu, "Sign out" | `POST /session/sign-out` (a form post, so it works without scripts), then sign-in with the "signed out" notice. No confirmation, because signing back in is quick and nothing is lost. |
| Language control | Switches language and direction for every admin page. The current page stays open. |

## Accessibility

- **Landmarks:** `<header>`, `<nav>` named "Main", `<main>` with `id` for the skip link.
- **Every page** has one heading level 1 and its own browser tab title.
- **The admin menu** is a disclosure button with `aria-expanded`, closed with Escape, focus returning to the button.
- **The drawer** traps focus while open and closes with Escape.
- **Focus order:** skip link, product name, environment badge (not focusable, read in order), language control, admin menu, sidebar items, main content.
- **Targets:** at least 44 by 44 px for sidebar items, the menu button and language links.
- **Zoom:** 200% and 320 px wide with no horizontal scrolling of the page.
