**Draft: needs owner approval**

# S1: Appearance setting (only if plan decision 3 is yes)

| | |
| --- | --- |
| Screen ID | `s1/appearance-setting` |
| Product | Customer app (Flutter) |
| Owner of the code | mobile-dev |
| Approved images | None yet |
| Requirements | No PRD ID. Supports Q-04 (contrast in light and dark mode). |
| API | None. Saved on the phone only. |
| Waits on | **Plan decision 3** (whether this screen exists at all). Plan decisions 1, 6. |

Shared patterns are in [README.md](README.md).

## Purpose

Neither the ROADMAP nor the PRD asks for an in-app appearance control. In S0 the app follows the phone's light or dark setting. **If the owner answers no to plan decision 3, this screen and the "Appearance" row on Account are not built**, and the app keeps following the phone. Nothing else in S1 changes.

If the answer is yes, this screen lets the person choose "Use phone setting", "Light" or "Dark" for FeenGo only.

| | Decision 3: no | Decision 3: yes |
| --- | --- | --- |
| Account | No "Appearance" row | "Appearance" row with the current value |
| Theme | Always follows the phone | Follows the choice here. "Use phone setting" is the default. |
| Launch screen | Follows the phone | Still follows the phone, because it is drawn before the app runs. With "Light" or "Dark" chosen against the phone's setting, the launch screen and the app can differ for a moment. |
| Work | None | This screen, one stored preference (`docs/ARCHITECTURE.md` section 11.3) |

## Layout, top to bottom

| # | Element | Component | Notes |
| --- | --- | --- | --- |
| 1 | Top bar | App bar | Back button at the top start, title "Appearance" |
| 2 | Options | Radio list, three rows | "Use phone setting", "Light", "Dark". Label at the start, radio at the end. |

## States

| State | Cause | What the person sees |
| --- | --- | --- |
| Ready | | The saved choice selected, "Use phone setting" if none |
| Changed | Tap an option | The theme changes at once, with a crossfade of at most 200 ms, or instantly with reduce motion on. Saved on the phone. |
| Choice cannot be saved | Storage write fails | Applies for this session. No message. Reported to crash reporting. |
| Offline, error, loading | Not applicable | Nothing on this screen uses the network |

The choice is kept when signing out and is not stored on the account.

## Text

| Key | English | Arabic (needs owner review) |
| --- | --- | --- |
| `settings.appearance.title` | Appearance | المظهر |
| `settings.appearance.option.system` | Use phone setting | حسب إعداد الهاتف |
| `settings.appearance.option.light` | Light | فاتح |
| `settings.appearance.option.dark` | Dark | داكن |

## Right-to-left notes

Label at the start, radio at the end; both mirror. The options keep their logical order.

## Interactions

| Action | Result |
| --- | --- |
| Tap an option | Applies and saves at once. Tapping the selected option does nothing. |
| Back | Account |
| The phone switches between light and dark | Followed only when "Use phone setting" is chosen |

## Accessibility

- One radio group named "Appearance", each option announced with its state.
- Focus stays on the chosen option after a change.
- Each row is at least 48 dp tall.
- Contrast passes in both themes, from the token build's check.
