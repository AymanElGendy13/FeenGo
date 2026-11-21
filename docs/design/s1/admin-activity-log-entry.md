**Draft: needs owner approval**

# S1: Activity log entry detail

| | |
| --- | --- |
| Screen ID | `s1/admin-activity-log-entry` |
| Product | Admin back office (Next.js). A side panel on `/activity-log`. |
| Owner of the code | web-dev |
| Approved images | None yet |
| Requirements | A-11 |
| API | None of its own. It shows an entry already loaded by `GET /v1/admin/activity-log`, because the contract has no endpoint for one entry (see the gap list). |
| Waits on | Plan decisions 1, 5, 6. |

Shared patterns are in [README.md](README.md).

## Purpose

Shows everything recorded for one entry: when, who, what, on which record, why, and the details such as old and new values for a setting change (A-11). Read-only.

## Layout, top to bottom

A side panel, 480 px wide, sliding in from the end side (right in English, left in Arabic) over the log, with a scrim. Under 768 px wide it fills the screen.

| # | Element | Notes |
| --- | --- | --- |
| 1 | Heading level 2, "Entry {id}" and a close button at the end | |
| 2 | Read-only note | "Entries can't be changed or deleted." |
| 3 | Facts, as a description list | Time (Cairo, with seconds), Time (UTC, ISO 8601), Who, Action, Record, Reason |
| 4 | Details | Depends on the action, see below |
| 5 | Links | "Show all entries for this record", "Show all entries by this admin" (when there is a record or an admin) |

### Details by action

| Action | How `details` is shown |
| --- | --- |
| `setting.changed` | A small table: Setting key, Scope, Venue (when set), Booking category (when set), Old value, New value, Old version, New version. Values are shown as JSON, monospace, left to right. |
| Entries by a server command (`actorType: system`) | "Operator" from `details.operator`, then any other fields |
| Any other action | Each field of `details` as a row: field name (monospace) and value (JSON, monospace) |
| Empty `details` | `admin.log.detail.noDetails` |

`details` never holds passwords, codes or tokens (contract). The panel shows it as text only and never renders it as HTML.

## States

| State | Cause | What the admin sees |
| --- | --- | --- |
| Open | Row clicked | The panel with the entry |
| No reason | `reason` is null | `admin.log.detail.noReason` |
| No record | `targetType` null | `admin.log.detail.noRecord`, and no "Show all entries for this record" link |
| System actor | `actorType: system` | Who: "System", with the operator. No "by this admin" link. |
| Long values | A value longer than the panel | Wraps inside a scrollable code block; never cut off |
| Address with an entry not on the page | `?entry=<id>` and the entry is not in the loaded pages | The panel does not open. The log shows as usual. (A direct link to an entry needs an endpoint the contract does not have.) |
| Narrow screen or 200% zoom | | Full-screen panel, description list stacks labels above values |

## Text

| Key | English | Arabic (needs owner review) |
| --- | --- | --- |
| `admin.log.detail.title` | Entry {id} | السجل رقم {id} |
| `admin.log.detail.close` | Close | إغلاق |
| `admin.log.detail.readOnly` | Entries can't be changed or deleted. | لا يمكن تعديل السجلات أو حذفها. |
| `admin.log.detail.timeCairo` | Time (Cairo) | الوقت (القاهرة) |
| `admin.log.detail.timeUtc` | Time (UTC) | الوقت (UTC) |
| `admin.log.detail.who` | Who | المنفّذ |
| `admin.log.detail.action` | Action | الإجراء |
| `admin.log.detail.record` | Record | العنصر |
| `admin.log.detail.reason` | Reason | السبب |
| `admin.log.detail.details` | Details | التفاصيل |
| `admin.log.detail.operator` | Operator | المشغّل |
| `admin.log.detail.settingKey` | Setting | الإعداد |
| `admin.log.detail.scope` | Scope | النطاق |
| `admin.log.detail.venue` | Venue | المكان |
| `admin.log.detail.category` | Booking category | فئة الحجز |
| `admin.log.detail.oldValue` | Old value | القيمة السابقة |
| `admin.log.detail.newValue` | New value | القيمة الجديدة |
| `admin.log.detail.oldVersion` | Old version | الإصدار السابق |
| `admin.log.detail.newVersion` | New version | الإصدار الجديد |
| `admin.log.detail.noReason` | No reason recorded | لا يوجد سبب مسجّل |
| `admin.log.detail.noRecord` | No record | لا يوجد عنصر |
| `admin.log.detail.noDetails` | No details recorded | لا توجد تفاصيل مسجّلة |
| `admin.log.detail.allForRecord` | Show all entries for this record | عرض كل سجلات هذا العنصر |
| `admin.log.detail.allByAdmin` | Show all entries by this admin | عرض كل سجلات هذا المسؤول |

Also used: action labels, record types and the "System" label from `admin-activity-log.md`.

## Right-to-left notes

**Mirrors:** the panel slides in from the left in Arabic, the close button is at the left, labels align right.

**Does not mirror:** times, IDs, keys, JSON values and field names, all left to right and monospace. The arrow between old and new version, if one is drawn, is not used; the two values are on separate labelled rows instead, so nothing needs mirroring.

## Interactions

| Action | Result |
| --- | --- |
| Close button, Escape, click on the scrim | Closes the panel. Focus returns to the row's "View" button. |
| "Show all entries for this record" | Closes the panel and sets the record filter on the log |
| "Show all entries by this admin" | Closes the panel and sets the admin filter |

The panel opens with a 200 ms slide, and without motion when the browser's reduce-motion setting is on.

## Accessibility

- The panel is a modal dialog (`role="dialog"`, `aria-modal="true"`) named by its heading. Focus moves to the heading when it opens and is kept inside until it closes.
- The facts are a `<dl>`, so each value is read with its label.
- JSON values are in `<code>` blocks with `dir="ltr"` and `lang` unset, so they are read character by character where needed.
- **Focus order:** heading, close, read-only note, facts, details, links.
- **Targets:** close and links at least 44 by 44 px.
- **Zoom:** 200% and 320 px wide without horizontal scrolling of the panel. Code blocks may scroll on their own.
