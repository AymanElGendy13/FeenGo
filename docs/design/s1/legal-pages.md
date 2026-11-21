**Draft: needs owner approval**

# S1: Legal pages (terms of use, privacy policy)

| | |
| --- | --- |
| Screen ID | `s1/legal-pages` |
| Product | Customer app (Flutter) |
| Owner of the code | mobile-dev |
| Approved images | None yet |
| Requirements | No PRD ID. `docs/STACK.md`, "Personal data": the privacy policy follows Egypt's Personal Data Protection Law. Store listings need a privacy policy link. |
| API | None. The pages are web pages. |
| Waits on | Plan decisions 1, 6. Q11 (the domain the pages live on). S1-Q3 (whether signing in accepts the terms). The text itself comes from a lawyer. |

Shared patterns are in [README.md](README.md).

## Purpose

Shows the terms of use and the privacy policy, in the app's language. The same two pages are linked from phone entry and Account, and from the store listings.

**Proposal:** the pages are web pages on FeenGo's domain (Q11), one per language, opened inside the app in the platform's in-app browser (Safari View Controller on iOS, Custom Tabs on Android). The store listings need public addresses anyway, and the lawyer's text can then change without an app release. The addresses come from the app's configuration. No architecture section covers this yet (see the gap list).

The page content is not designed here. It needs its own layout in both languages, with right-to-left Arabic, when the text exists.

## Layout

The platform's in-app browser, with its own top bar and close button. The app adds nothing inside it.

| Page | English address | Arabic address |
| --- | --- | --- |
| Terms of use | `https://<domain>/en/terms` | `https://<domain>/ar/terms` |
| Privacy policy | `https://<domain>/en/privacy` | `https://<domain>/ar/privacy` |

The app opens the address for its current language.

## States

| State | Cause | What the person sees |
| --- | --- | --- |
| Loading | | The in-app browser's own progress bar |
| Shown | Page loads | The page |
| Offline or the page fails | No connection, or an error page | The in-app browser's own error. Closing it returns to the app. |
| Addresses not configured yet | Before Q11 is answered | The rows and links are hidden in builds that have no address configured, so nobody reaches an empty page. Testers' builds must have them before an external release. |
| Largest text | | The in-app browser follows the phone's text size where the platform supports it. The web pages must reflow at 200% zoom. |

## Text

| Key | English | Arabic (needs owner review) |
| --- | --- | --- |
| `legal.terms.title` | Terms of use | شروط الاستخدام |
| `legal.privacy.title` | Privacy policy | سياسة الخصوصية |
| `legal.opensInBrowser` | Opens in a browser view | يُفتح في نافذة متصفح |

`legal.opensInBrowser` is a spoken hint on the rows and links only, not visible text.

## Right-to-left notes

The in-app browser's controls follow the phone's system language, not the app's. The Arabic pages set `dir="rtl"` and `lang="ar"` themselves.

## Interactions

| Action | Result |
| --- | --- |
| Tap "Terms of use" or "Privacy policy" | Opens the in-app browser at the page for the current language |
| Close the in-app browser | Back to the screen that opened it, with its state kept (for example a typed phone number) |

## Accessibility

- Rows and links announce their name and the hint "Opens in a browser view".
- Links in the phone entry terms line are at least 44 by 44 points.
- The web pages themselves must meet WCAG AA, reflow at 200% zoom, and use real headings. This is a requirement for whoever builds them.
