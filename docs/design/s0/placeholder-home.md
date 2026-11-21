**Draft: needs owner approval**

# S0: Placeholder home

| | |
| --- | --- |
| Screen ID | `s0/placeholder-home` |
| Product | Customer app (Flutter). A web variant for the two dashboards is at the end. |
| Owner of the code | mobile-dev (app), web-dev (dashboards) |
| Approved images | None. This spec is the design. No visual design is expected for S0. |
| Lifetime | S0 only. Replaced by the real Home in S3. The language control moves to the Account area in S1. |

## Purpose

The only screen in S0. It proves the app shell works:

- the app opens and shows text in English or Arabic
- Arabic is laid out right to left
- the app shows light and dark themes, following the phone's setting
- text follows the phone's text size
- the language choice is remembered

It is deliberately minimal: the app name, a short welcome line and a language control. There is no in-app appearance control. Following the phone's light or dark setting is enough to prove both themes. Whether to add an in-app control later is an owner decision (`docs/design/plan.md`, section 6, decision 3).

| Requirement | How this screen serves it |
| --- | --- |
| Q-02 | Runs on the supported iPhone and Android versions. It is the screen tested on real phones for S0 "done". |
| Q-04 | Follows the phone's text size. Every text and control meets contrast in light and dark (see the contrast check). |
| Q-06 | Nothing visible. The single S0 test event is defined by the architect in `docs/ARCHITECTURE.md`. The language control sends no event. |
| C-03, groundwork brought forward from S1 | The ROADMAP asks S0 for a language switch and right-to-left layout. **Saving the language choice** is C-03 ("The choice is remembered"). This spec brings that part forward into S0, so the owner can test it on real phones. C-03 itself is delivered and tested in S1. |

## Layout, top to bottom

One centred column inside the safe area. The content is never wider than 480 dp, so it stays readable on tablets. The column scrolls when it is taller than the screen. There is no app bar and no tab bar.

All values are provisional. Token names follow the roles below. The tokens are created in `packages/design-tokens` after this spec is approved.

| # | Element | Component | Type (provisional, IBM Plex Sans Arabic) | Spacing |
| --- | --- | --- | --- | --- |
| 1 | Top space | | | Flexible space that pushes the group to the visual centre, at least 48 dp |
| 2 | App name, "FeenGo" | Text, marked as a heading | Display: 32 sp, Bold. Line height 40 sp in English, 44 sp in Arabic. | |
| 3 | Welcome line | Text | Body: 16 sp, Regular. Line height 24 sp in English, 26 sp in Arabic. | 8 dp below the app name. Centred. At most two lines on a standard phone. |
| 4 | Language section title, "Language" | Text, marked as the label of the group below | Label: 14 sp, Medium. Line height 20 sp in English, 22 sp in Arabic. | 48 dp below the welcome line. Aligned to the start. |
| 5 | Language control: English, العربية | Segmented control with 2 options (Material `SegmentedButton`) | Label: 14 sp, Medium. Line height 20 sp in English, 22 sp in Arabic. | 8 dp below its title. Full column width. |
| 6 | Bottom space | | | Flexible, at least 48 dp, plus the bottom safe area |

The Arabic line heights follow the rule in `docs/design/brief.md` section 6: Arabic needs more line height than Latin.

- Side padding is 24 dp.
- Each segment is at least 48 dp tall.
- The selected segment shows a check mark at the start of its label, so selection is never shown by colour alone. No other icons are used, which keeps the labels fitting at large text sizes.

**Large text fallback.** When the labels no longer fit on one line in their segments, the control becomes a vertical list of radio rows, one option per row. Each row is at least 48 dp tall, with the label on the start side and the radio on the end side. Text is never cut off, shrunk or truncated.

### Colour roles (provisional palette only)

The provisional palette fails contrast in dark mode for Primary as text or as an outline (2.41 to 1, see `docs/design/brief.md` section 8). This screen therefore uses only pairs that pass. Accent is used only for the dark-mode focus ring, and Success is not used.

| Role | Light | Dark | Used for |
| --- | --- | --- | --- |
| surface | #FBF6EE | #1C2430 | Screen background, unselected segments |
| onSurface | #1C2430 | #FBF6EE | Welcome line, section title, unselected labels |
| brandText | #B3204F | #FBF6EE | App name |
| outline | #1C2430 | #FBF6EE | 1 dp edge of the segmented control, and the divider between segments |
| selected | #B3204F | #FBF6EE | Fill of the selected segment |
| onSelected | #FFFFFF | #1C2430 | Label and check mark of the selected segment |
| focus | #B3204F | #F2A93B | Focus ring for keyboard and switch access |

**Focus ring:** 2 dp wide, in the `focus` role. It is drawn **outside** the focused option, separated from it by a gap of at least 2 dp in the `surface` colour. This keeps it visible next to the selected fill, which in light mode is the same colour as the ring.

Builders map these roles to theme colours explicitly. Do not generate a colour scheme from a seed colour, because that replaces the approved values.

**System bars:** the status bar and Android navigation bar icons are dark in light mode and light in dark mode. On Android the app draws edge to edge, behind the system bars, and keeps content inside the insets.

### Contrast check

| Pair | Light | Dark | Needed |
| --- | --- | --- | --- |
| onSurface on surface (text) | 14.52 | 14.52 | 4.5 |
| brandText on surface (app name, large text) | 6.03 | 14.52 | 3.0 for large text. Meets 4.5 too. |
| onSelected on selected (segment label) | 6.49 | 14.52 | 4.5 |
| selected against surface (selected state) | 6.03 | 14.52 | 3.0 |
| outline against surface (control edge) | 14.52 | 14.52 | 3.0 |
| focus against surface (ring against its gap) | 6.03 | 7.82 | 3.0 |

### Launch screen

- A plain surface colour that matches the phone's light or dark setting.
- On Android 12 and later, the temporary app icon is shown in the centre, as the system requires.
- No text.
- The app also follows the phone's setting, so the launch screen and the app always match.

## States

| State | What happens |
| --- | --- |
| Theme | Always follows the phone's light or dark setting, including live changes while the app is open. Nothing is saved. |
| First launch, language | Always English. The person switches to Arabic with the language control, and the choice is remembered. **Decided by the owner on 2026-11-19** (see below). |
| Before a language is chosen | English at every launch until a language is chosen. |
| After a language is chosen | The saved choice wins at every launch, even if the phone's language changes. |
| Opening | The saved language is read before the first frame is drawn, so the screen never flashes in the wrong language or direction. There is no loading indicator. |
| Saved choice cannot be read | Use the first-launch rule. No message. Report the failure to crash reporting. |
| Choice cannot be saved | The choice still applies for this session. No message. Report to crash reporting. |
| Offline | Works fully. Nothing on this screen needs a connection, so there is no offline banner. |
| Largest text size | The column scrolls. The control switches to the vertical list where needed (see "Large text fallback"). |
| Landscape and tablets | The same column, centred, at most 480 dp wide, scrolling if needed. |
| Empty, error, no permission | Not applicable in the app. The web variant has a not-found state (see "Not-found state" under the web variant). Empty, other errors and no permission are not applicable there either. |

### First-launch language (decided 2026-11-19)

`docs/DECISIONS.md` makes English the default language. The original proposal treated "default" as the fallback:

- A phone set to Arabic opens the app in Arabic.
- Any other phone opens it in English.

This is the platform convention, and it suits an Egyptian audience. The alternative is "always English on first launch". Arabic-speaking users would then have to find the switch themselves.

**Decided by the owner on 2026-11-19: always English on first launch and first visit** (DECISIONS.md). The proposal above is kept for the record only.

## Text

Every text is a translation key. Keys are written here in dotted form. Builders map them to each platform's naming, for example `homePlaceholderWelcome` in Flutter ARB files.

**All Arabic copy needs owner review,** including the voice (Modern Standard or Egyptian Arabic) and the Arabic name. Arabic copy uses forms that read as gender-neutral, including to screen readers.

| Key | English | Arabic (needs owner review) | Notes |
| --- | --- | --- | --- |
| `app.name` | FeenGo | FeenGo | Provisional. The Arabic name is to be confirmed (candidate: فين جو). Until then the Latin name is shown in both languages. The same value is used for the name under the app icon. |
| `home.placeholder.welcome` | Welcome. Places to eat, go out and celebrate are coming soon. | أهلًا وسهلًا. أماكن للأكل والسهر والاحتفال قريبًا. | Gender-neutral greeting. "السهر" (evenings out) replaces "الخروج", which can read as "exit". |
| `settings.language.title` | Language | اللغة | Also the accessible name of the language control |
| `settings.language.option.en` | English | English | Language names are always shown in their own language, never translated. |
| `settings.language.option.ar` | العربية | العربية | As above |

The launch screen and the temporary app icon carry no translatable text.

## Right-to-left notes

**Mirrors in Arabic**

- The whole layout direction. The section title aligns to the start, which is the right in Arabic.
- The order of the segments. They are listed in logical order (English, then العربية), so in Arabic English sits at the right.
- The check mark's position, at the start of the selected label.
- In the large-text list, the label is at the start and the radio at the end.

**Does not mirror**

- The Latin name "FeenGo". It is always written left to right, including inside Arabic text.
- The check mark glyph itself.
- The option labels. "English" stays in Latin script and "العربية" in Arabic script, in both languages.

**Switching**

- Changing the language changes the text and the layout direction together, at once. There is no restart and no animation.

## Interactions

| Action | Result |
| --- | --- |
| Tap a language option | The whole app switches to that language and direction immediately. The choice is saved on the phone (C-03 groundwork). The screen keeps its scroll position. Tapping the selected option does nothing. |
| Phone switches between light and dark while the app is open | The app follows at once, with a crossfade of at most 200 ms, or instantly when the phone's reduce-motion setting is on. |
| Phone's language changes while the app is open | Nothing: the app ignores the phone's language. |
| Android back button or gesture | Leaves the app, as the system normally does. |
| Long press, swipe | Nothing. |

The in-app choice applies to FeenGo only, not to the phone.

**Out of scope for S0, assigned to S1 under C-03:**

- Keeping the in-app choice in step with the system's per-app language setting (Android 13 and later, and iOS Settings), so the two never disagree.
- Storing the language choice on the person's account, so notifications use it (C-18). The architect decides how.

## Accessibility

- **Headings:** the app name is a heading. VoiceOver and TalkBack should say "FeenGo" as "feen go". If either says "fingo", set the spoken label to "Feen Go".
- **Group:** the segmented control is one group, named by its section title. Each option is announced as a selectable item with its state, for example "Language, English, selected, 1 of 2".
- **Option language:** the spoken label of "English" is marked as English and "العربية" as Arabic. Each is then read in the right voice, whatever the app language.
- **Focus and reading order:** app name, welcome line, language title, English, العربية. In Arabic the order is the same in logical terms, read from the right.
- **After a language change:** focus stays on the selected option, which is then announced in the new language.
- **Touch targets:** every option is at least 48 by 48 dp, which also meets the 44 by 44 point minimum on iOS. Options never shrink at small widths. The control switches to the vertical list instead.
- **Text size:** follows the phone's setting up to the largest size (iOS accessibility sizes, Android 200%) with nothing cut off. Test at the smallest size, the default size and the largest size.
- **Contrast:** every pair passes. See the contrast check.
- **Motion:** only the theme crossfade, which is removed when reduce motion is on.
- **Keyboard and switch access:** both options can be reached and chosen. The focus ring follows the focus ring rule above.

## Review checklist after the build

Take screenshots or golden images in English and Arabic, with the phone set to light and to dark. Use the smallest, default and largest text sizes, on a small phone (360 dp wide) and a large phone. Check that:

1. No text is cut off, and the large-text fallback appears where needed.
2. Arabic is fully right to left, and "FeenGo" is written left to right inside it.
3. The screen never flashes the wrong language or direction on opening.
4. The language choice survives closing and reopening the app.
5. The theme follows the phone, including a live switch.
6. The colours match the role table exactly, and the focus ring is visible next to the selected fill.

## Web variant: dashboard placeholders (partner and admin)

The two empty Next.js apps show the same screen, with these differences.

| | Partner dashboard | Admin back office |
| --- | --- | --- |
| Name key | `partner.app.name`: "FeenGo Partner" / "FeenGo للشركاء" | `admin.app.name`: "FeenGo Admin" / "إدارة FeenGo" |
| Welcome key | `home.placeholder.welcome`, the same as the app | The same |

Both names are provisional and need owner approval.

- **Language and direction:** the page's `lang` and `dir` attributes change with the language. The server sends the right ones from the first byte, so the page never flashes left to right. The choice is remembered in the browser.
- **First visit:** always English, as for the app (owner decision, 2026-11-19).
- **Theme:** follows the browser's `prefers-color-scheme` setting only.
- **Page title:** uses the name key.
- **Control:** the language control is a radio group with a visible label. Every option can be reached with the keyboard, and the focus ring follows the same rule as the app.
- **Width and zoom:** the column is at most 480 px wide and centred. The large-text fallback applies when the browser's text is zoomed to 200%.

### Not-found state (web, both dashboards)

**Provisional: needs owner approval,** like the rest of this spec. It replaces the framework's built-in English 404 page, which breaks the bilingual, token-colour and logical-direction rules.

Shown for any address that has no page. The server answers with HTTP status 404.

- **Layout:** the same placeholder layout and colour roles as the home page, top to bottom: the app name heading (its name key, unchanged), the not-found title, the body line, the home link, then the language section and control. Spacing as on the home page: title 8 px below the app name, body 8 px below the title, link 16 px below the body, language section 48 px below the link. Logical properties only (start and end), no left or right.
- **Type:** the not-found title uses the Label style at 18 px, Medium, in `onSurface`. The body uses the Body style in `onSurface`.
- **Home link:** yes, one link to the dashboard's home page, `/`. It is the one primary action. It is a text link in `onSurface`, underlined so it is never shown by colour alone, at least 44 by 44 px as a target, with the same focus ring rule.
- **Language control:** kept, and works as on the home page. Switching it keeps the person on the not-found page.
- **`lang` and `dir`:** follow the saved language, sent by the server from the first byte, as on the home page. First visit is English.
- **Theme:** follows `prefers-color-scheme`, as on the home page.

| Key | English | Arabic (needs owner review) | Notes |
| --- | --- | --- | --- |
| `error.notFound.title` | Page not found | الصفحة غير موجودة | Also the first part of the page title |
| `error.notFound.body` | This page doesn't exist or has moved. | هذه الصفحة غير موجودة أو تم نقلها. | Passive, so gender-neutral |
| `error.notFound.home` | Go to the home page | الذهاب إلى الصفحة الرئيسية | Verbal noun, not an imperative, so gender-neutral |

**Accessibility**

- **One `h1`:** the app name stays the page's only `h1`, as on the home page. The not-found title is an `h2`.
- **Page title:** `error.notFound.title`, a separator, then the name key. For example "Page not found – FeenGo Partner" and "الصفحة غير موجودة – FeenGo للشركاء".
- **Reading and focus order:** app name, title, body, home link, language title, English, العربية.
- The link's accessible name is its visible text.
