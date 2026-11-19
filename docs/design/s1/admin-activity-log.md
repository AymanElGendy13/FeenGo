**Draft: needs owner approval**

# S1: Activity log

| | |
| --- | --- |
| Screen ID | `s1/admin-activity-log` |
| Product | Admin back office (Next.js), path `/activity-log` |
| Owner of the code | web-dev |
| Approved images | None yet |
| Requirements | A-11 |
| API | `GET /v1/admin/activity-log` with `limit`, `cursor`, `action`, `actorAdminId`, `targetType`, `targetId`, `from`, `to` |
| Waits on | Plan decisions 1, 5 (digits in times and IDs), 6. |

Shared patterns are in [README.md](README.md).

## Purpose

Shows every recorded admin action and server command, newest first, with who, what and when (A-11). It is read-only: nothing on this page can change or delete an entry, and the page says so.

| Requirement | How this screen serves it |
| --- | --- |
| A-11 | Lists every entry with who, what and when. Offers no edit or delete. |

In S1 the actions are: admin created, signed in, signed out, failed sign-in, locked, unlocked, authenticator reset, disabled, and setting changed (`ActivityAction` in the contract). Later slices add their own; the page shows any action it does not know by its raw name, so a new action never breaks it.

## Layout, top to bottom

Inside the admin shell.

| # | Element | Component | Notes |
| --- | --- | --- | --- |
| 1 | Heading level 1, "Activity log" | | |
| 2 | Explanation | Body text | Newest first, entries cannot be changed, times are Cairo time |
| 3 | Filter bar | Filter bar | Action select, "From" date, "To" date, "Apply", "Clear filters" |
| 4 | Active filter chips | Filter chips | One chip per filter set by clicking in the table: "Admin: Salma Hassan", "Record: Setting auth.otp.code_ttl_seconds". Each chip has a remove button. |
| 5 | Inline banner | Inline banner | Errors |
| 6 | Table | Data table | Columns below. 50 rows per page. |
| 7 | "Load more" | Secondary button | Under the table, while `nextCursor` is not null. Replaced by `admin.log.end` on the last page. |

### Table columns

| Column | Content | Notes |
| --- | --- | --- |
| Time | `occurredAt` in Cairo time: "19 Nov 2026, 14:05" | 24-hour clock, a proposal for audit clarity. Full time with seconds in the detail. |
| Who | `actorAdminName` for admins. "System" plus `details.operator` for server commands: "System · Ahmed (operator)". | The name is a button: "Show only this admin" (sets `actorAdminId`). For system rows it is plain text. |
| Action | The translated action label | Plain text |
| Record | Translated `targetType` and the `targetId` | The record is a button: "Show only this record" (sets `targetType` and `targetId`). An admin ID is shown shortened to its first 8 characters, with the full ID in the detail and in its spoken label. A setting key is shown in full. Empty when there is no target. |
| Reason | `reason`, or an em dash when there is none | Truncated to two lines; full text in the detail |

Each row opens the entry detail (`admin-activity-log-entry.md`) when clicked or when its "View" button is used. The "View" button is the last cell of each row, so keyboard users have a clear target.

Under 768 px wide, or at 200% zoom, each row becomes a card: time and action on the first line, who and record on the next, reason under them.

### Filters

| Filter | Control | Sent as |
| --- | --- | --- |
| Action | Select: "All actions" and the nine S1 actions, by their translated labels | `action` |
| From | Date field, a day in Cairo time | `from`: the start of that day in Cairo, converted to UTC |
| To | Date field, a day in Cairo time, inclusive | `to`: the start of the **next** day in Cairo, in UTC, because the contract's `to` is "before this time" |
| Admin | Only by clicking a name in the table (chip) | `actorAdminId` |
| Record | Only by clicking a record in the table (chip) | `targetType` and `targetId` |

There is no admin picker, because no endpoint lists admins (see the gap list). Filters are kept in the page address, so a filtered view can be bookmarked and shared with another admin.

## States

| State | Cause | What the admin sees |
| --- | --- | --- |
| Loading | First page in flight | Skeleton rows, the filter bar usable |
| Loaded | `200 ActivityLogPage` with items | The table |
| Loading more | "Load more", next page in flight | Button progress. Rows already shown stay. |
| Last page | `nextCursor` is null | `admin.log.end` in place of the button |
| No entries at all | `200`, no items, no filters | `admin.log.empty` |
| No match | `200`, no items, filters set | `admin.log.emptyFiltered` and "Clear filters" |
| Dates the wrong way round | Client check: "To" before "From" | Field message `admin.log.error.dateOrder` on "To". Nothing sent. |
| Bad filter in the address | `400 VALIDATION_FAILED` (for example a changed `action` or `cursor`) | Banner `admin.log.error.badFilter`, filters cleared, first page loaded again |
| Too many requests | `429 RATE_LIMITED` | Banner with the shared message and the wait |
| Could not load | `503`, `500` | Banner `admin.log.error.load` with "Try again". `INTERNAL_ERROR` shows the request ID. Rows already shown stay. |
| Session ended | `401` after one refresh | Redirect to sign-in with the "session ended" notice and `from` set to this page with its filters |
| Not allowed | `403 FORBIDDEN` or `MFA_REQUIRED` | Redirect to sign-in. Should never happen behind `proxy.ts`. |
| Unknown action | An `action` value not in the app's translations | The raw action, such as `venue.approved`, in a monospace style |
| Admin name missing | `actorAdminName` is null for an admin row | `admin.log.actor.unknown` with the shortened ID |
| Narrow screen or 200% zoom | | Cards instead of the table. Filter bar wraps. |

## Text

| Key | English | Arabic (needs owner review) | Notes |
| --- | --- | --- | --- |
| `admin.log.title` | Activity log | سجل النشاط | Heading |
| `admin.log.pageTitle` | Activity log · FeenGo Admin | سجل النشاط · إدارة FeenGo | Browser tab |
| `admin.log.intro` | Every admin action and server command, newest first. Entries can't be changed or deleted. Times are Cairo time. | جميع إجراءات الإدارة وأوامر الخادم، الأحدث أولًا. لا يمكن تعديل السجلات أو حذفها. الأوقات بتوقيت القاهرة. | |
| `admin.log.filter.action` | Action | الإجراء | |
| `admin.log.filter.allActions` | All actions | جميع الإجراءات | |
| `admin.log.filter.from` | From | من | |
| `admin.log.filter.to` | To | إلى | |
| `admin.log.filter.apply` | Apply | تطبيق | |
| `admin.log.filter.clear` | Clear filters | مسح عوامل التصفية | |
| `admin.log.chip.admin` | Admin: {name} | المسؤول: {name} | |
| `admin.log.chip.record` | Record: {type} {id} | العنصر: {type} {id} | |
| `admin.log.chip.remove` | Remove filter {label} | إزالة عامل التصفية {label} | Spoken label of the chip's remove button |
| `admin.log.col.time` | Time | الوقت | |
| `admin.log.col.who` | Who | المنفّذ | |
| `admin.log.col.action` | Action | الإجراء | |
| `admin.log.col.record` | Record | العنصر | |
| `admin.log.col.reason` | Reason | السبب | |
| `admin.log.view` | View | عرض | Row button |
| `admin.log.viewLabel` | View entry {id} | عرض السجل رقم {id} | Spoken label of the row button |
| `admin.log.onlyAdmin` | Show only this admin | عرض سجلات هذا المسؤول فقط | Spoken label and tooltip of a name |
| `admin.log.onlyRecord` | Show only this record | عرض سجلات هذا العنصر فقط | |
| `admin.log.actor.system` | System · {operator} (operator) | النظام · {operator} (المشغّل) | |
| `admin.log.actor.unknown` | Unknown admin {id} | مسؤول غير معروف {id} | |
| `admin.log.loadMore` | Load more | عرض المزيد | |
| `admin.log.end` | That's every entry. | لا توجد سجلات أخرى. | |
| `admin.log.empty` | No activity yet. | لا يوجد نشاط بعد. | |
| `admin.log.emptyFiltered` | No entries match these filters. | لا توجد سجلات تطابق عوامل التصفية هذه. | |
| `admin.log.error.dateOrder` | The "To" date must be on or after the "From" date. | يجب أن يكون تاريخ "إلى" في يوم "من" نفسه أو بعده. | |
| `admin.log.error.badFilter` | Some filters weren't valid, so they were cleared. | بعض عوامل التصفية غير صالحة، لذلك تم مسحها. | |
| `admin.log.error.load` | The activity log couldn't load. Try again. | تعذّر تحميل سجل النشاط. يُرجى المحاولة مرة أخرى. | |

### Action labels

| Key | English | Arabic (needs owner review) |
| --- | --- | --- |
| `admin.log.action.admin.created` | Admin account created | إنشاء حساب إدارة |
| `admin.log.action.admin.signed_in` | Signed in | تسجيل الدخول |
| `admin.log.action.admin.signed_out` | Signed out | تسجيل الخروج |
| `admin.log.action.admin.sign_in_failed` | Failed sign-in | محاولة تسجيل دخول فاشلة |
| `admin.log.action.admin.locked` | Sign-in locked | قفل تسجيل الدخول |
| `admin.log.action.admin.unlocked` | Sign-in unlocked | إلغاء قفل تسجيل الدخول |
| `admin.log.action.admin.totp_reset` | Authenticator reset | إعادة ضبط تطبيق المصادقة |
| `admin.log.action.admin.disabled` | Admin account disabled | تعطيل حساب إدارة |
| `admin.log.action.setting.changed` | Setting changed | تغيير إعداد |

### Record types

| Key | English | Arabic (needs owner review) |
| --- | --- | --- |
| `admin.log.target.admin_user` | Admin account | حساب إدارة |
| `admin.log.target.setting` | Setting | إعداد |
| Unknown type | The raw type, monospace | |

## Right-to-left notes

**Mirrors:** the column order (Time at the right in Arabic), text alignment in cells, the filter bar order, chips and their remove buttons, the "Load more" alignment.

**Does not mirror:** times and dates (left-to-right isolates inside cells), IDs, setting keys, raw action names, operator names in Latin script. Cells holding IDs and keys are left to right and use a monospace style.

Date fields use the browser's date picker, which follows the browser's language. Their value is shown in the chosen digit set (plan decision 5).

## Interactions

| Action | Result |
| --- | --- |
| Change a filter and "Apply" | The address updates and the first page loads. Without scripts the filter bar is a `GET` form, so it still works. |
| "Clear filters" | All filters and chips removed, first page loads |
| Click a name or a record | Adds the chip and reloads from the first page |
| Remove a chip | Removes that filter and reloads |
| "Load more" | Appends the next page. Focus moves to the first new row. |
| Click a row or "View" | Opens the entry detail panel |

New entries that happen while the page is open are not added live. Reloading the page shows them.

## Accessibility

- **The table** is a real `<table>` with a caption ("Activity log, newest first") and column headers (`<th scope="col">`). Each row's time cell is the row header.
- **Names and records** are buttons with spoken labels that say what they do ("Show only this admin, Salma Hassan").
- **Loading more** announces "{count} more entries loaded" (`admin.log.loaded`, below) politely.
- **Filters** have visible labels. The date order error is tied to the "To" field.
- **Focus order:** heading, explanation, filter bar, chips, banner, table (row by row, each row's buttons in column order), "Load more".
- **Targets:** at least 44 by 44 px for buttons, chips' remove buttons and the row "View" buttons.
- **Zoom:** at 200% and 320 px wide, the cards layout appears with no horizontal scrolling.
- **Contrast:** AA, including the monospace IDs and the em dash.

| Key | English | Arabic (needs owner review) |
| --- | --- | --- |
| `admin.log.loaded` | {count, plural, one {# more entry loaded} other {# more entries loaded}} | {count, plural, zero {لم يتم تحميل سجلات أخرى} one {تم تحميل سجل واحد إضافي} two {تم تحميل سجلين إضافيين} few {تم تحميل # سجلات إضافية} many {تم تحميل # سجلًا إضافيًا} other {تم تحميل # سجل إضافي}} |

## Review checklist after the build

1. There is no control anywhere that changes or deletes an entry.
2. A "To" date includes the whole day in Cairo time.
3. A system entry shows the operator's name.
4. An unknown action from a later slice shows its raw name instead of breaking the page.
