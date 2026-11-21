**Draft: needs owner approval**

# S1: Account deleted

| | |
| --- | --- |
| Screen ID | `s1/account-deleted` |
| Product | Customer app (Flutter) |
| Owner of the code | mobile-dev |
| Approved images | None yet |
| Requirements | C-04, Q-07 |
| API | None. Shown after `DELETE /v1/me` answers `204`. |
| Waits on | Plan decisions 1, 6. Q5. |

Shared patterns are in [README.md](README.md).

## Purpose

Confirms that the account is gone and the person is signed out everywhere, then returns them to the app as a visitor. It is the end of the delete account flow.

## Layout, top to bottom

One centred column, 24 dp side padding, at most 480 dp wide. No back button.

| # | Element | Component | Notes |
| --- | --- | --- | --- |
| 1 | Top space | | Flexible, pushes the group towards the visual centre |
| 2 | Check icon | Icon, decorative | In the information colour, not success green, because this is not a celebration |
| 3 | Title, "Account deleted" | Text, heading, screen title type | |
| 4 | Explanation | Body text | What happened |
| 5 | "Done" | Primary button | 32 dp below |

## States

| State | Cause | What the person sees |
| --- | --- | --- |
| Shown | `204` from `DELETE /v1/me`, or a `401` from `GET /v1/me` after a timed-out deletion | The screen. The app has already deleted its tokens, reset analytics and become a visitor. |
| Offline, error, loading | Not applicable | Nothing here uses the network |
| Largest text | | The column scrolls |

The language choice and the installation ID stay on the phone. A new sign-in with the same number creates a new, empty account.

## Text

| Key | English | Arabic (needs owner review) |
| --- | --- | --- |
| `account.deleted.title` | Account deleted | تم حذف الحساب |
| `account.deleted.body` | Your account and personal details have been deleted, and you've been signed out on every phone. You can keep browsing FeenGo without an account. | تم حذف الحساب والبيانات الشخصية، وتم تسجيل الخروج من جميع الهواتف. يمكن مواصلة تصفح FeenGo بدون حساب. |
| `common.action.done` | Done | تم |

## Right-to-left notes

The column is centred, so only text alignment inside wrapped lines changes. The check icon does not mirror.

## Interactions

| Action | Result |
| --- | --- |
| "Done", system back, swipe back | Home, as a visitor. The account and delete screens are removed from the back history, so back cannot return to them. |

## Accessibility

- When the screen appears, focus moves to the title, and the title and explanation are announced.
- The icon is hidden from screen readers.
- **Focus order:** title, explanation, "Done".
- "Done" is at least 48 dp tall.
- **Largest text size:** nothing cut off.
