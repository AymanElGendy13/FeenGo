**Draft: needs owner approval**

# FeenGo glossary

The words FeenGo uses, in English and Arabic, so that the app, the partner dashboard and the back office say the same thing the same way. Each product keeps its own translation files (`docs/ARCHITECTURE.md` section 14); this glossary keeps them consistent. Owned by ui-ux-designer.

**All Arabic terms need owner review.** They are drafted in simple Modern Standard Arabic. The voice is plan decision 6 in `docs/design/plan.md`, and some terms change with it (marked "voice"). Arabic terms are chosen to be gender-neutral: verbal nouns for actions, no second-person endings.

Rules for every entry:

- Use the term exactly as listed, in every product, unless the "Audience" column says otherwise.
- Use the term for the action on buttons, and the same term in messages about it.
- Add a term here before using a new word for something that already has one.

## Brand and products

| English | Arabic | Notes |
| --- | --- | --- |
| FeenGo | FeenGo | Always with a capital G. The Arabic name waits on plan decision 7 (candidate: فين جو). Until then the Latin name is used in Arabic too, as a left-to-right isolate. |
| FeenGo Admin | إدارة FeenGo | The back office. Provisional. |
| FeenGo Partner | FeenGo للشركاء | The partner dashboard (S2). Provisional. |
| WhatsApp | واتساب | The common Egyptian spelling |
| SMS | رسالة نصية | Plural رسائل نصية. "By SMS": برسالة نصية. |

## People

| English | Arabic | Audience | Notes |
| --- | --- | --- | --- |
| Guest (visitor) | بدون حساب | Customers | Someone using the app without an account. "Visitor" is the PRD's role name; on screen, "guest". Arabic says "without an account" (التصفح بدون حساب), because زائر is masculine. |
| Customer | عميل | Venues and admins | Never used to address customers on screen |
| Admin | مسؤول | Admins | A member of the FeenGo team in the back office. Plural مسؤولون. |
| Owner (FeenGo owner) | مالك FeenGo | Admins | The person who runs the server commands, such as unlocking an admin |
| Operator | المشغّل | Admins | The person named when a server command runs (activity log) |
| Venue | مكان | All | A restaurant, cafe or other place on FeenGo. Plural أماكن. Alternative for review: منشأة. |

## Account and sign-in

| English | Arabic | Audience | Notes |
| --- | --- | --- | --- |
| Account | حساب | All | |
| Sign in | تسجيل الدخول | All | Never "log in" or "login" in English copy. One step for new and existing customers. |
| Sign out | تسجيل الخروج | All | Never "log out" |
| Create an account | إنشاء حساب | Customers | Happens through signing in with a new number. Never "sign up" or "register" on screen. |
| Mobile number | رقم الهاتف المحمول | Customers | Not "phone number" on screen. Short form where space is tight: رقم الهاتف. |
| Code | رمز | Customers | The one-time code sent by WhatsApp or SMS. Voice: Egyptian Arabic would use كود. Never "OTP" or "PIN" on screen. |
| Send code | إرسال الرمز | Customers | |
| Resend code | إعادة إرسال الرمز | Customers | |
| Expired (code) | انتهت صلاحيته | Customers | "This code has expired": انتهت صلاحية هذا الرمز |
| Paused (customer sign-in after wrong codes) | إيقاف مؤقت | Customers | Customers see "paused", which is calmer. Admins see "locked". Both mean the same lock. |
| Locked (admin sign-in) | قفل | Admins | |
| Confirm it's you | تأكيد الهوية | Customers | A new code before a sensitive action, such as deleting the account |
| Session | جلسة | Admins | Customers never see this word; they see "signed out". |
| Password | كلمة المرور | Admins | |
| Authenticator app | تطبيق المصادقة | Admins | |
| Authenticator code | رمز المصادقة | Admins | |

## Profile and settings

| English | Arabic | Audience | Notes |
| --- | --- | --- | --- |
| Profile | الملف الشخصي | Customers | |
| Edit profile | تعديل الملف الشخصي | Customers | |
| Name | الاسم | All | |
| Email | البريد الإلكتروني | All | Never "e-mail" |
| Optional | اختياري | All | |
| Settings | الإعدادات | All | In the app: the Settings section of Account. In the back office (S4): the settings console. |
| Setting | إعداد | Admins | One stored rule, such as a code expiry |
| Language | اللغة | All | Language names are never translated: English, العربية |
| Appearance | المظهر | Customers | Only if plan decision 3 is yes |
| Use phone setting | حسب إعداد الهاتف | Customers | Appearance option |
| Light, Dark | فاتح، داكن | All | |
| Delete account | حذف الحساب | Customers | Not "close" or "deactivate", which mean something else |
| Terms of use | شروط الاستخدام | All | |
| Privacy policy | سياسة الخصوصية | All | |

## Back office

| English | Arabic | Notes |
| --- | --- | --- |
| Activity log | سجل النشاط | A-11 |
| Entry (in the activity log) | سجل | "Entry 42": السجل رقم 42 |
| Action | الإجراء | |
| Record (what an action was done to) | العنصر | |
| Reason | السبب | |
| Server command | أمر الخادم | |
| System | النظام | The actor for server commands |
| Filter | عامل التصفية | Plural عوامل التصفية |

## Common actions

| English | Arabic | Notes |
| --- | --- | --- |
| Continue | متابعة | |
| Save | حفظ | |
| Cancel | إلغاء | Cancels the current step only. Never used for cancelling a booking (S4 will add its own term). |
| Close | إغلاق | |
| Done | تم | |
| Back | رجوع | |
| Try again | إعادة المحاولة | |
| Not now | ليس الآن | |
| Skip for now | تخطٍّ الآن | |
| Discard | تجاهل | |
| Delete | حذف | |

## Message patterns

| Pattern | English | Arabic |
| --- | --- | --- |
| Asking for something | Enter your ... | يُرجى إدخال ... |
| Something failed | We couldn't ... / ... couldn't load | تعذّر ... |
| Something happened | ... has been ... / You've ... | تم ... |
| Waiting | Try again in {duration} | يُرجى المحاولة مرة أخرى بعد {duration} |
| In progress | Sending ..., Saving ..., Checking ... | جارٍ ... |
