# FeenGo product requirements

These are the requirements for the first release: what each of the three products must do, and how to check that it does. Every booking, cancellation, deposit and fee rule is a setting that can be changed without new code, because the right values will only be known after talking to venues.

Each requirement has an ID. Use it in branch names, commit messages, test names and reviews, so every change can be traced to a requirement. The order in which requirements are built is in `docs/ROADMAP.md`.

## Users and roles

| Role | Who they are | What they can do |
| --- | --- | --- |
| Visitor | Anyone who opens the app without signing in | Browse and search venues |
| Customer | A signed-in person | Book, request events, pay deposits, review |
| Venue owner | The person who registered the venue | Everything for their venue, including policies and staff |
| Venue staff | Invited by the owner | Handle bookings and event requests for their venue |
| Admin | The FeenGo team | Approve venues, change settings, handle disputes |

Each role sees only its own data. A venue never sees another venue's bookings, and a customer never sees another customer's.

## Changeable rules

Every value in this section is stored as a setting, never written into the code. Admin sets the platform limits and defaults in the back office. Each venue then chooses its own values inside those limits. All defaults below are starting suggestions.

### Booking categories

The four categories are themselves a list that admin can edit, rename or add to.

| Category | Books through | Default booking window | Default deposit | Default cancellation policy |
| --- | --- | --- | --- | --- |
| Normal table | Instant booking | 1 hour to 30 days ahead | None | Flexible |
| Birthday or small gathering | Event request | 2 days to 2 months ahead | 20% of the quote | Flexible |
| Engagement, graduation, corporate | Event request | 1 week to 6 months ahead | 30% of the quote | Moderate |
| Wedding or large event | Event request | 1 month to 12 months ahead | 40% of the quote | Strict |

Weddings stay in the settings from the start, but wedding halls are onboarded in a later release.

### Cancellation policies

A venue picks one policy per category. Customers see the policy's name and plain-language meaning before they book.

| Policy | Free cancellation for tables until | Free cancellation for events until | After that |
| --- | --- | --- | --- |
| Flexible | 2 hours before | 48 hours before | The venue keeps the deposit |
| Moderate | 24 hours before | 7 days before | The venue keeps the deposit |
| Strict | 48 hours before | 30 days before | The venue keeps the deposit |

### Other settings

| Setting | Who sets it | Default |
| --- | --- | --- |
| Confirmation for normal tables | Venue | Automatic |
| Party size that always needs venue confirmation | Venue, within admin limit | 8 or more |
| Time a venue has to answer a pending booking | Admin | 3 hours, then it expires |
| Slot hold while the customer completes a booking | Admin | 5 minutes |
| Grace period before a table can be released | Venue, within admin limit | 15 minutes |
| No-shows before a customer must pay a deposit on tables | Admin | 3 |
| Deposit for customers who reached the no-show limit | Admin | EGP 100 |
| Optional deposit on peak-time tables | Venue | Off |
| Time a venue has to answer an event request | Admin | 24 hours |
| How long a quote stays valid | Venue, within admin limit | 48 hours |
| Site visit request before paying an event deposit | Venue | On for engagements and weddings |
| Reminder times before a booking | Admin | 24 hours and 2 hours |
| Review window after a visit | Admin | 14 days |
| Platform commission on event bookings | Admin | 0% during the free year |
| Customer service fee per event category | Admin | EGP 0 during the free year |
| Venue subscription plans and prices | Admin | All venues free during the free year |
| End date of the free period | Admin | 12 months after launch |
| Lists: categories, occasions, cuisines, areas | Admin | Seeded at launch |

### Requirements for the settings themselves

| ID | Requirement | Acceptance check |
| --- | --- | --- |
| R-01 | Every rule above is a stored setting | Changing a value in the back office changes app behaviour with no new release |
| R-02 | Venue choices are limited by admin ranges | A venue cannot save a deposit or window outside the admin limits |
| R-03 | A booking keeps the rules it was made under | Changing a policy later does not change existing bookings |
| R-04 | Setting changes are logged | The log shows who changed what, the old value, the new value and when |

## Booking statuses

Every booking is always in exactly one status, and both the customer and the venue see the same one.

### Normal booking

| Status | Meaning | Can move to |
| --- | --- | --- |
| Pending | Waiting for the venue to accept | Confirmed, Declined, Expired, Cancelled by customer |
| Confirmed | The table is held for the customer | Attended, No-show, Cancelled by customer, Cancelled by venue |
| Declined | The venue said no | End |
| Expired | The venue did not answer in time | End |
| Cancelled by customer | The cancellation policy decides the deposit | End |
| Cancelled by venue | Any deposit is refunded in full | End |
| Attended | The venue marked the visit as done | End, and the customer can review |
| No-show | The customer did not arrive within the grace period | End, and one strike is recorded |

With automatic confirmation, a booking skips Pending and starts as Confirmed.

### Event booking

| Status | Meaning | Can move to |
| --- | --- | --- |
| Requested | The customer sent the request | Quoted, Declined, Expired, Cancelled by customer |
| Quoted | The venue sent one or more quotes | Awaiting deposit, Expired, Cancelled by customer |
| Awaiting deposit | The customer accepted a quote | Confirmed, Expired |
| Confirmed | The deposit is paid | Completed, Cancelled by customer, Cancelled by venue |
| Completed | The event took place | End, and the customer can review |
| Declined, Expired, Cancelled | Same meanings as for normal bookings | End |

## Customer app requirements

### Account

| ID | Requirement | Acceptance check |
| --- | --- | --- |
| C-01 | Browse without an account | A visitor can search and open venue pages. Booking asks them to sign in, then returns them to the same place. |
| C-02 | Sign in with a phone number and one-time code | The code arrives by WhatsApp, or SMS if WhatsApp fails. It expires after 5 minutes. Five wrong tries lock sign-in for 15 minutes. |
| C-03 | Arabic and English | Every screen works in both languages. Arabic is laid out right to left. The choice is remembered. |
| C-04 | Profile | The customer can edit their name and optional email, and can delete their account from inside the app. |

### Discovery

| ID | Requirement | Acceptance check |
| --- | --- | --- |
| C-05 | Home screen | Shows categories, occasions, featured venues and venues near the customer. |
| C-06 | Search and filters | Results can be filtered by area, category, cuisine, price range, occasion and "open now", and shown as a list or on a map. |
| C-07 | Venue page | Shows photos, description, menu, hours, map, capacity, accepted occasions, rating, reviews, the cancellation policy in plain words, and a WhatsApp link. |
| C-08 | Share a venue | A shared link opens the venue in the app, or the store page if the app is not installed. |

### Normal booking

| ID | Requirement | Acceptance check |
| --- | --- | --- |
| C-09 | Book a table | The customer picks a date, time and party size and can add a note. Only available slots are offered. |
| C-10 | No double booking | The chosen slot is held while the customer finishes. Two customers can never both get the last table. |
| C-11 | Clear result | The customer sees Confirmed or Pending straight away, and is notified when a pending booking is answered. |
| C-12 | Change or cancel | Before confirming a cancellation, the app states what happens to any deposit under the venue's policy. |
| C-13 | No-show limit | After the set number of no-shows, the customer must pay the set deposit to book a table. |

### Events

| ID | Requirement | Acceptance check |
| --- | --- | --- |
| C-14 | Request an event | The customer gives the occasion, date, guest count, budget range, extras and notes, and can ask for a site visit first where the venue allows it. |
| C-15 | Review quotes | Each quote shows the package, total price, deposit, cancellation policy and expiry. The customer can accept or decline. |
| C-16 | Pay a deposit | Payment runs through Paymob by card or wallet. Success confirms the booking and shows a receipt. A failed payment leaves the booking unpaid and lets the customer retry. |

### After booking

| ID | Requirement | Acceptance check |
| --- | --- | --- |
| C-17 | My bookings | Upcoming and past bookings are listed with their current status. |
| C-18 | Notifications | The customer is notified of confirmations, declines, quotes, reminders and cancellations, in their chosen language. |
| C-19 | Reviews | Only a customer whose booking was Attended or Completed can review, once per booking, with 1 to 5 stars and optional text. |
| C-20 | Referral code and help | Each customer has a code to share. A help screen offers contact and "report a problem". |

## Partner dashboard requirements

The venue dashboard is a website that must work well on a phone or tablet, because venue staff rarely sit at a computer.

| ID | Requirement | Acceptance check |
| --- | --- | --- |
| P-01 | Venue sign-up | The owner enters business details, uploads the commercial registration and tax card, and accepts the partner agreement. The accepted version and time are recorded. |
| P-02 | Approval status | The venue sees Pending, Approved or Rejected with a reason, and can fix and resubmit. It is not visible to customers until approved. |
| P-03 | Venue profile | The venue manages photos, description, menu, hours, location, categories, accepted occasions and capacity. |
| P-04 | Availability | The venue sets opening hours, slot length, capacity per slot and blocked dates. |
| P-05 | Block a slot by hand | Staff can record a phone or walk-in booking, so the app never offers a table that is already taken. |
| P-06 | Policies | The venue chooses confirmation mode, a cancellation policy per category and deposit levels, inside the admin limits. |
| P-07 | Bookings inbox | Staff accept or decline pending bookings, see upcoming ones, and mark each as Attended or No-show. |
| P-08 | Event requests | Staff see each request in full, reply with one or more quotes, or decline with a reason. |
| P-09 | Cancel as the venue | When the venue cancels, the customer is notified and any deposit is refunded in full automatically. |
| P-10 | Alerts | The venue is alerted to new bookings and requests by WhatsApp or email, so nothing waits for someone to open the dashboard. |
| P-11 | Staff accounts | The owner invites staff and removes them. Staff cannot change policies or business details. |
| P-12 | Payments view | The venue sees deposits received, fees deducted and what it has been paid. |
| P-13 | Statistics | Shows bookings, events, no-show rate and average rating for a chosen period. |

## Admin back office requirements

| ID | Requirement | Acceptance check |
| --- | --- | --- |
| A-01 | Secure admin sign-in | Admin accounts need a second sign-in step. No admin screen opens without it. |
| A-02 | Venue approval queue | New venues appear in a queue with their documents. Approve makes the venue live. Reject requires a reason that the venue sees. |
| A-03 | Manage venues and users | Admin can search, view, suspend and restore any venue or customer. |
| A-04 | Settings console | Every value in the changeable rules section can be viewed and edited here. |
| A-05 | Lists | Admin manages categories, occasions, cuisines and areas, in Arabic and English. |
| A-06 | Featured venues | Admin chooses which venues are featured, and for how long. |
| A-07 | Bookings and disputes | Admin can open any booking, see its full history, and issue a refund or change its status with a written reason. |
| A-08 | Review moderation | Admin can hide a review that breaks the rules. The reason is recorded. |
| A-09 | Agreement versions | Admin publishes new versions of the partner agreement and terms. Venues are asked to accept the new version. |
| A-10 | Metrics | Shows venues live, bookings per week, share of events, no-show rate and repeat customers. |
| A-11 | Activity log | Every admin action is recorded with who, what and when, and cannot be edited. |

## Quality requirements

These apply to all three products and to every slice.

| ID | Requirement | Acceptance check |
| --- | --- | --- |
| Q-01 | Speed | Main screens show content within 2 seconds on a normal mobile connection. Search answers within 1 second on the server. |
| Q-02 | Phones supported | The app runs on iOS 15 or later and Android 8 or later. These versions are a proposal and can change. |
| Q-03 | Poor connection | The app shows the customer's existing bookings without a connection, and explains clearly when an action needs one. |
| Q-04 | Accessibility | Text respects the phone's text-size setting, and all text meets contrast standards in light and dark mode. |
| Q-05 | Security | The security baseline in `docs/STACK.md` is met. |
| Q-06 | Analytics | The app records sign-up, search, venue view, booking, request, quote, payment and review events, with the campaign that brought the user. |
| Q-07 | Store rules | Account deletion works inside the app, and a demo account exists for store reviewers. |

## Not in the first release

Boats and ships, onboarding wedding halls, loyalty points, promo codes, in-app chat, a native app for venues, links to venue point-of-sale systems, waiting lists, and paid plans. The database supports paid plans from the start, but they stay switched off.

## Open questions

These do not block work. Each one has a default in this document, so work can continue.

- [ ] **Deposit money flow.** Can Paymob send each deposit directly to the venue and the fee to FeenGo, so that customer money never sits in FeenGo's account? To be confirmed with Paymob and an accountant before S6.
- [ ] **Refund timing.** How long does a Paymob refund take to reach the customer, and who pays the payment fee on a refunded deposit?
- [ ] **Rule values.** All defaults in the changeable rules section need checking with real venues once there is a demo to show.
- [ ] **Launch districts.** Which two or three districts come first?
- [ ] **Tax on fees.** How VAT applies to commissions and service fees once pricing starts.
