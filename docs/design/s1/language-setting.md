**Draft: needs owner approval**

# S1: Language setting

| | |
| --- | --- |
| Screen ID | `s1/language-setting` |
| Product | Customer app (Flutter) |
| Owner of the code | mobile-dev |
| Approved images | None yet |
| Requirements | C-03 |
| API | `PATCH /v1/me` with `language`, when signed in |
| Waits on | Plan decisions 1, 6. |

Shared patterns are in [README.md](README.md).

## Purpose

The person chooses English or Arabic. The choice applies at once to the whole app, is remembered on the phone, and, when signed in, is saved to the account so that FeenGo's messages (sign-in codes now, notifications from S4) use it (C-03, C-18).

It replaces the language control on the S0 placeholder home. The rules from the S0 spec carry over unchanged: saving on the phone, reading the saved choice before the first frame, and no restart.

**First launch: always English** (`docs/DECISIONS.md`, 2026-11-19). The phone's system language is never followed: a phone set to Arabic still opens FeenGo in English. Only a choice the person makes counts: on this screen, or an explicit change to FeenGo's own per-app language in the phone's settings after the first launch (see Interactions, and the feasibility note there).

| Requirement | How this screen serves it |
| --- | --- |
| C-03 | Both languages, Arabic right to left, the choice remembered on the phone and on the account |

## Layout, top to bottom

| # | Element | Component | Notes |
| --- | --- | --- | --- |
| 1 | Top bar | App bar | Back button at the top start, title "Language" |
| 2 | Options | Radio list, two rows | "English", "العربية". Each row: label at the start, radio at the end. At least 48 dp tall. |
| 3 | Explanation | Caption | Under the list: the choice also sets the language of FeenGo's messages |

A radio list replaces S0's segmented control, because this is now a settings screen and the list never needs a large-text fallback.

## States

| State | Cause | What the person sees |
| --- | --- | --- |
| Ready | | The current language selected |
| Changed, visitor | Tap the other option | The app switches language and direction at once. Saved on the phone. No request. |
| Changed, signed in | Tap the other option | The same, and `PATCH /v1/me` `{ "language": "ar" }` in the background |
| Account update failed | `PATCH` fails (offline, `503`, `500`, timeout) | Nothing shown. The phone keeps the choice. The app sends the update again at the next launch and the next time it returns to the foreground, until it succeeds. |
| Session ended during the update | `401` after one failed refresh | The phone keeps the choice. The person is signed out as `account.md` describes. |
| Largest text | | Rows grow, the explanation wraps |

There is no loading or error state on screen, because the change never waits for the server.

## Text

| Key | English | Arabic (needs owner review) | Notes |
| --- | --- | --- | --- |
| `settings.language.title` | Language | اللغة | Existing S0 key. Title and the list's group name. |
| `settings.language.option.en` | English | English | Existing S0 key. Never translated. |
| `settings.language.option.ar` | العربية | العربية | Existing S0 key. Never translated. |
| `settings.language.explanation` | FeenGo's messages to you, such as sign-in codes, also use this language. | تُستخدم هذه اللغة أيضًا في رسائل FeenGo، مثل رموز تسجيل الدخول. | |

## Right-to-left notes

**Mirrors:** label at the start (right) and radio at the end (left). The back button at the top right.

**Does not mirror:** "English" stays in Latin script and "العربية" in Arabic script. The options keep their logical order: English first.

**Switching:** text and direction change together, at once, with no restart and no animation. The screen stays open with the new language, and the back button moves to the other side.

## Interactions

| Action | Result |
| --- | --- |
| Tap an option | Applies and saves at once (see States). Tapping the selected option does nothing. |
| Back | Account, in the chosen language |
| After the first launch, the person explicitly changes FeenGo's per-app language in the phone's settings (Android 13 and later, iOS Settings; see the feasibility note below) | The app treats this change as the person's choice: it applies, saves on the phone and, when signed in, updates the account. The phone's system language is never treated as a choice, so a phone set to Arabic still opens FeenGo in English at first launch (`docs/DECISIONS.md`, 2026-11-19). When the person chooses here, the app also sets the phone's per-app language where the platform allows, so the two never disagree. How this is done is for mobile-dev. |

**Feasibility note for mobile-dev, to confirm before S1 is built.** On iOS, the app may not be able to tell a deliberate per-app language change in Settings apart from the phone's own language, because both can reach the app as its preferred language. That would break "always English at first launch". On Android 13 and later, the per-app setting reports only a language chosen for the app. If iOS cannot tell the two apart reliably, the alternative is to count a per-app change as a choice only where the platform reports app-chosen languages (Android 13 and later), and elsewhere to count only a choice made on this screen. This is a note for mobile-dev, not a decision; the spec is updated once mobile-dev confirms.

## Accessibility

- The list is one group named "Language". Each option is announced as a radio button with its state: "English, selected, 1 of 2".
- The spoken label of "English" is marked as English, and "العربية" as Arabic, so each is read in the right voice.
- After a change, focus stays on the chosen option, which is announced in the new language.
- **Focus order:** back, title, English, العربية, explanation.
- **Touch targets:** the back button is at least 44 by 44 points. Each row is full width and at least 48 dp tall.
- **Largest text size:** nothing cut off.

## Review checklist after the build

1. The change applies at once, with no flash and no restart.
2. Signed in, changing language offline still works, and the account catches up later.
3. A sign-in code requested after switching to Arabic arrives in Arabic.
