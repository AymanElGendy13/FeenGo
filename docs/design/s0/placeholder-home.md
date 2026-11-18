**Draft: needs owner approval**

# S0: Placeholder home

| | |
| --- | --- |
| Screen ID | `s0/placeholder-home` |
| Product | Customer app (Flutter). A web variant for the two dashboards is at the end. |
| Owner of the code | mobile-dev (app), web-dev (dashboards) |
| Approved images | None. This spec is the design. No visual design is expected for S0. |
| Lifetime | S0 only. Replaced by the real Home in S3. The language and appearance controls move to the Account tab in S1. |

## Purpose

The only screen in S0. It proves the app shell works: the app opens, shows text in English or Arabic, lays out right to left in Arabic, switches between light and dark, respects the phone's text size, and remembers the choices. It is deliberately minimal: the app name, a short welcome line, and two controls.

| Requirement | How this screen serves it |
| --- | --- |
| Q-02 | Runs on the supported iPhone and Android versions. It is the screen tested on real phones for S0 "done". |
| Q-04 | Follows the phone's text size. Every text and control meets contrast in light and dark (see the contrast table). |
| Q-06 | Shows nothing for analytics. The single S0 test event is defined by the architect in `docs/ARCHITECTURE.md`. This screen's controls send no events. |
| C-03 (groundwork) | The language switch, right-to-left layout and remembered choice. C-03 itself is delivered in S1. |

## Layout, top to bottom

One centred column inside the safe area. The content is never wider than 480 dp, so it stays readable on tablets. The column scrolls when it is taller than the screen. There is no app bar and no tab bar.

Provisional values. Token names follow the roles below and are created in `packages/design-tokens` after this spec is approved.

| # | Element | Component | Type (provisional, IBM Plex Sans Arabic) | Spacing |
| --- | --- | --- | --- | --- |
| 1 | Top space | | | Flexible space that pushes the group to the visual centre, at least 48 dp |
| 2 | App name, "FeenGo" | Text, marked as a heading | Display: 32 sp, Bold, line height 40 sp | |
| 3 | Welcome line | Text | Body: 16 sp, Regular, line height 24 sp in English, 26 sp in Arabic | 8 dp below the app name. Centred, at most two lines on a standard phone. |
| 4 | Language section title, "Language" | Text, marked as the label of the group below | Label: 14 sp, Medium, line height 20 sp | 48 dp below the welcome line. Aligned to the start. |
| 5 | Language control: English, العربية | Segmented control with 2 options (Material `SegmentedButton`) | Label: 14 sp, Medium | 8 dp below its title. Full column width. |
| 6 | Appearance section title, "Appearance" | Text, marked as the label of the group below | Label: 14 sp, Medium | 32 dp below the language control. Aligned to the start. |
| 7 | Appearance control: System, Light, Dark | Segmented control with 3 options | Label: 14 sp, Medium | 8 dp below its title. Full column width. |
| 8 | Bottom space | | | Flexible, at least 48 dp, plus the bottom safe area |

Side padding is 24 dp. Each segment is at least 48 dp tall. The selected segment shows a check mark at the start of its label, so selection is never shown by colour alone. No other icons are used, which keeps the labels fitting at large text sizes.

**Large text fallback.** When the labels of a segmented control no longer fit on one line in their segments, that control becomes a vertical list of radio rows, one option per row. Each row is at least 48 dp tall with the label on the start side and the radio on the end side. Text is never cut off, shrunk or truncated.

### Colour roles (provisional palette only)

The provisional palette fails contrast in dark mode for Primary as text or as an outline (2.41 to 1, see `docs/design/brief.md` section 8). This screen therefore uses only pairs that pass. Accent and Success are not used.

| Role | Light | Dark | Used for |
| --- | --- | --- | --- |
| surface | #FBF6EE | #1C2430 | Screen background, unselected segments |
| onSurface | #1C2430 | #FBF6EE | Welcome line, section titles, unselected labels |
| brandText | #B3204F | #FBF6EE | App name |
| outline | #1C2430 | #FBF6EE | 1 dp edge of the segmented controls and the dividers between segments |
| selected | #B3204F | #FBF6EE | Fill of the selected segment |
| onSelected | #FFFFFF | #1C2430 | Label and check mark of the selected segment |
| focus | #B3204F | #F2A93B | 2 dp focus ring for keyboard and switch access |

Builders map these roles to theme colours explicitly. Do not generate a colour scheme from a seed colour, because that replaces the approved values.

The status bar and Android navigation bar icons are dark in light mode and light in dark mode. On Android the app draws edge to edge, behind the system bars, and keeps content inside the insets.

### Contrast check

| Pair | Light | Dark | Needed |
| --- | --- | --- | --- |
| onSurface on surface (text) | 14.52 | 14.52 | 4.5 |
| brandText on surface (app name, large text) | 6.03 | 14.52 | 3.0 (large text), meets 4.5 too |
| onSelected on selected (segment label) | 6.49 | 14.52 | 4.5 |
| selected against surface (selected state) | 6.03 | 14.52 | 3.0 |
| outline against surface (control edge) | 14.52 | 14.52 | 3.0 |
| focus against surface | 6.03 | 7.82 | 3.0 |

### Launch screen

- A plain surface colour that matches the phone's light or dark setting. On Android 12 and later, the temporary app icon is shown in the centre, as the system requires. No text.
- The launch screen follows the phone's setting, not the in-app choice, because the system draws it before the app starts. Someone who chose Dark on a phone set to Light sees a light launch screen for a moment. This is accepted for S0.

## States

| State | What happens |
| --- | --- |
| First launch, language | Follows the phone's language if it is Arabic or English. Otherwise English. **Owner to confirm** (see "Decision needed" below). |
| First launch, appearance | System: follows the phone's light or dark setting. |
| Before a choice is made | The app keeps following the phone's language and appearance at each launch. |
| After a choice is made | The saved choice wins at every launch, even if the phone's settings change. |
| Opening | The saved language and appearance are read before the first frame is drawn, so the screen never flashes in the wrong language, direction or theme. There is no loading indicator. |
| Saved choices cannot be read | Use the first-launch rules. No message. Report the failure to crash reporting. |
| A choice cannot be saved | The choice still applies for this session. No message. Report to crash reporting. |
| Offline | Works fully. Nothing on this screen needs a connection, so there is no offline banner. |
| Largest text size | The column scrolls. Controls switch to the vertical list where needed (see "Large text fallback"). |
| Landscape and tablets | The same column, centred, at most 480 dp wide, scrolling if needed. |
| Empty, error, no permission | Not applicable. |

### Decision needed: first-launch language

`docs/DECISIONS.md` makes English the default language. The proposal above treats "default" as the fallback: a phone set to Arabic opens in Arabic, any other phone opens in English. This is the platform convention, and it suits an Egyptian audience. The alternative is "always English on first launch", in which case Arabic-language users have to find the switch. The owner chooses one.

## Text

Every text is a translation key. Keys are written here in dotted form. Builders map them to each platform's naming, for example `homePlaceholderWelcome` in Flutter ARB files. **All Arabic copy needs owner review**, including the voice (Modern Standard or Egyptian) and the Arabic name.

| Key | English | Arabic (needs owner review) | Notes |
| --- | --- | --- | --- |
| `app.name` | FeenGo | FeenGo | Provisional. The Arabic name is to be confirmed (candidate: فين جو). Until then the Latin name is shown in both languages. The same value is used for the name under the app icon. |
| `home.placeholder.welcome` | Welcome. Places to eat, go out and celebrate are coming soon. | أهلًا بك. أماكن للأكل والخروج والاحتفال قريبًا. | Gender-neutral Arabic |
| `settings.language.title` | Language | اللغة | Also the accessible name of the language control |
| `settings.language.option.en` | English | English | Language names are always shown in their own language, never translated |
| `settings.language.option.ar` | العربية | العربية | As above |
| `settings.appearance.title` | Appearance | المظهر | Also the accessible name of the appearance control |
| `settings.appearance.option.system` | System | حسب الجهاز | |
| `settings.appearance.option.light` | Light | فاتح | |
| `settings.appearance.option.dark` | Dark | داكن | |
| `settings.appearance.option.system.hint` | Follows your phone's light or dark setting | يتبع إعداد الوضع الفاتح أو الداكن في هاتفك | Screen reader hint only |

The launch screen and temporary app icon carry no translatable text.

## Right-to-left notes

**Mirrors in Arabic**

- The whole layout direction. Section titles align to the start, which is the right in Arabic.
- The order of the segments. They are listed in logical order (English, then العربية; System, Light, Dark), so in Arabic the first option sits at the right.
- The check mark's position, at the start of the selected label.
- In the large-text list: label at the start, radio at the end.

**Does not mirror**

- The Latin name "FeenGo". It is always written left to right, including inside Arabic text.
- The check mark glyph itself.
- The option label "English" stays in Latin script, and "العربية" stays in Arabic script, in both languages.

**Switching**

- Changing the language changes the text and the layout direction together, at once, without restarting the app and without an animation.

## Interactions

| Action | Result |
| --- | --- |
| Tap a language option | The whole app switches to that language and direction immediately. The choice is saved on the phone. The screen keeps its scroll position. Tapping the selected option does nothing. |
| Tap an appearance option | System follows the phone's setting, including live changes while the app is open. Light and Dark override it. The theme changes with a crossfade of at most 200 ms, or instantly when the phone's reduce-motion setting is on. The choice is saved on the phone. |
| Phone's language or appearance changes while the app is open | If no choice has been saved (or System is chosen for appearance), the app follows the change at once. |
| Android back button or gesture | Leaves the app, as the system normally does. |
| Long press, swipe | Nothing. |

The in-app choice applies to FeenGo only, not to the phone. Android 13 and later and iOS also offer a per-app language setting in the system settings. The app should stay in step with it, so the two never disagree. mobile-dev confirms whether this is possible in S0. If not, it goes in S1 with C-03.

In S1, the language choice is also stored on the person's account, so notifications use it (C-18). That is the architect's decision, not part of S0.

## Accessibility

- **Headings:** the app name is a heading. VoiceOver and TalkBack should say "FeenGo" as "feen go". If either says "fingo", set the spoken label to "Feen Go".
- **Groups:** each segmented control is one group, named by its section title, and each option is announced as a selectable item with its state. For example: "Language, English, selected, 1 of 2".
- **Option language:** the spoken label of "English" is marked as English and "العربية" as Arabic, so each is read in the right voice whatever the app language.
- **Hint:** the System option carries the hint in the text table.
- **Focus and reading order:** app name, welcome line, language title, English, العربية, appearance title, System, Light, Dark. In Arabic the order is the same in logical terms, read from the right.
- **After a language change:** focus stays on the selected option, which is then announced in the new language.
- **Touch targets:** every option is at least 48 by 48 dp, which also meets the 44 by 44 point minimum on iOS. Options do not shrink at small widths. The control switches to the vertical list instead.
- **Text size:** follows the phone's setting up to the largest size (iOS accessibility sizes, Android 200%) with nothing cut off. Test at the smallest size, the default size and the largest size.
- **Contrast:** all pairs pass, see the contrast check.
- **Motion:** only the theme crossfade, which is removed when reduce motion is on.
- **Keyboard and switch access:** every option can be reached and chosen. The focus ring is the provisional `focus` role.

## Review checklist after the build

Screenshots or golden images in English and Arabic, light and dark, at the smallest, default and largest text sizes, on a small phone (360 dp wide) and a large phone:

1. No text is cut off, and the large-text fallback appears where needed.
2. Arabic is fully right to left, and "FeenGo" is written left to right inside it.
3. There is no flash of the wrong language, direction or theme on opening.
4. Choices survive closing and reopening the app.
5. The colours match the role table exactly.

## Web variant: dashboard placeholders (partner and admin)

The two empty Next.js apps show the same screen, with these differences:

| | Partner dashboard | Admin back office |
| --- | --- | --- |
| Name key | `partner.app.name`: "FeenGo Partner" / "FeenGo للشركاء" | `admin.app.name`: "FeenGo Admin" / "إدارة FeenGo" |
| Welcome key | `home.placeholder.welcome`, the same as the app | The same |

Both names are provisional and need owner approval.

- The page's `lang` and `dir` attributes change with the language, and the server sends the right ones from the first byte, so there is no flash of left-to-right layout. The choice is remembered in the browser.
- System appearance follows the browser's `prefers-color-scheme` setting.
- First-visit language follows the browser's language, with the same rule as the app.
- The page title uses the name key.
- The segmented controls are radio groups with visible labels and a visible focus ring. Every option can be reached with the keyboard.
- The column is at most 480 px wide and centred. The large-text fallback applies when the browser's text is zoomed to 200%.
