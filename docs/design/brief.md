**Draft: needs owner approval**

# FeenGo design brief and decision guide

This brief prepares the owner's design decisions: brand, visual direction, logo, typography and colour. It does not make those decisions. Each section ends with the choices the owner needs to make. The order and timing of those choices are in `docs/design/plan.md`.

Sources: `CLAUDE.md`, `docs/ROADMAP.md`, `docs/PRD.md`, `docs/STACK.md`, `docs/DECISIONS.md`. Requirement IDs refer to `docs/PRD.md`.

Fixed inputs, already decided:

- The name is **FeenGo**, always with a capital G. "Feen" means "where" in Egyptian Arabic, so the name reads "where to go?".
- English is the primary and default language. Arabic is a full second language, laid out right to left. Screens are designed in English first and checked in Arabic every time.
- Table reservations are for restaurants, cafes and upscale places that take reservations (instant booking). Events such as birthdays, engagements and corporate events are request-for-quote.
- Visual designs and the logo are made and approved by the owner outside the repository, for example in Figma. They are then exported into `docs/design/`.
- The provisional tokens in `docs/ROADMAP.md` are used until the design system is approved. They are replaced later by a single edit in `packages/design-tokens`.

---

## 1. Products and audience

FeenGo has three products on one brand. They share tokens, but each has its own audience and context, so each uses the brand with a different intensity.

### Customer app (Flutter, iPhone and Android)

| | |
| --- | --- |
| Who | Young and mid-age adults in Egyptian cities, roughly 18 to 45, who go out to eat, meet friends and celebrate. A second group plans events for others: a parent organising a birthday, a couple planning an engagement, an office manager booking a corporate dinner. |
| Devices | Mostly Android, from low-cost phones with 360 dp wide screens and slow storage to recent flagships. A significant share of iPhones in the target districts. Mobile data can be slow or patchy. |
| Context | Short sessions on the move, or evening browsing at home. Plans are often made in a WhatsApp group, so sharing a venue (C-08) and returning to it matter. Tables are often booked the same day. Events are planned days or months ahead, involve money and need trust. |
| Language | Many urban users keep their phone in English but chat in Arabic or in "Franco" (Arabic written in Latin letters). Others use Arabic throughout. Both must feel native, not translated. |
| What they need | Find a good place fast, know it is really available, book in a few taps, and trust that the booking and the deposit are safe. |

### Partner dashboard (Next.js website, used mostly on phones at the venue)

| | |
| --- | --- |
| Who | The venue owner, who sets up the profile and policies. Managers, hosts and staff, who accept bookings, record walk-ins and mark arrivals. |
| Devices | Mostly the staff member's own phone, sometimes a shared tablet at the host stand, and occasionally a laptop for setup. It is a mobile website, not a native app. |
| Context | Standing, one hand busy, interrupted by guests, in a dim restaurant at night or in sunlight on a terrace, with background noise. Alerts arrive by WhatsApp or email (P-10) and the person taps through to act. |
| Language | Staff choose their own language. Arabic may be preferred by many staff even when the owner uses English. |
| What they need | Very fast, very clear actions: accept, decline, mark Attended or No-show, block a slot. Big touch targets, high contrast, glanceable status, few screens. |

### Admin back office (Next.js website)

| | |
| --- | --- |
| Who | The FeenGo team. |
| Devices | Laptops and desktop browsers. Phone use is rare and only for urgent checks. |
| Context | Careful, high-impact work: approving venues, refunds, disputes, settings. Every action needs a reason and is logged (A-11). Content is bilingual, so Arabic and English values are reviewed side by side. |
| What they need | Dense tables, strong search and filters, unmistakable confirmations for destructive actions, and a clear audit trail. Brand expression is minimal here. Function comes first. |

---

## 2. Brand personality

Proposed attributes. Each says what FeenGo is and what it must not become.

| Attribute | FeenGo is | FeenGo is not |
| --- | --- | --- |
| Welcoming | A good host: warm, polite, at ease in both languages | Over-familiar, cheesy, full of exclamation marks |
| Dependable | A booking is a promise. Status, policies and money are always clear. | Bureaucratic, cold, legalistic |
| Effortless | Few taps, plain words, no surprises | Bare, simplistic, hiding important details |
| Celebratory | Occasions matter. Birthdays and engagements feel special. | Loud, childish, gimmicky |
| Proudly local | Egyptian, bilingual and city-savvy | Tourist cliché: pyramids, hieroglyphs, Pharaonic motifs |

### Questions for the owner to confirm the personality

1. If FeenGo were a person greeting guests at the door, who would they be? A friendly neighbourhood host, a polished concierge, or a fun friend who knows every place?
2. Which three words should a customer use to describe FeenGo after their first booking?
3. Where is the centre of gravity: everyday cafes and casual dining, or upscale places and special occasions? Both are in scope, but the visual direction leans one way.
4. Arabic voice: Modern Standard Arabic, Egyptian colloquial, or simple neutral Arabic with an Egyptian touch in marketing moments only? This affects every Arabic string from S1 onward.
5. English voice: polished and calm, or playful and chatty?
6. How visible should "Egyptian" be in the brand: subtle (language, tone, photography) or explicit (patterns, colours, local references)?
7. Should events feel like a separate, more premium experience, or part of the same app with the same tone?
8. Which brands do you admire, in any category? Which do you want FeenGo never to resemble?
9. Are there colours you love, or colours to avoid because of strong local associations, such as football club colours, political colours or competitor brands?
10. Arabic copy and gender: should the app address people in gender-neutral forms (recommended), or use one grammatical gender?

---

## 3. Reference products to study

Study these for patterns, not for looks. "Verify" marks items the owner should check against what local customers actually use.

| Product | Why it is relevant | What to learn | What to avoid |
| --- | --- | --- | --- |
| OpenTable | The global reservation standard | The booking pattern: date, time and party size, then time chips around the chosen time. Plain confirmation, reminders and a review prompt after the visit. | Dense, dated listing screens. Promotions crowding the home screen. |
| Resy | Upscale, editorial reservations | Confident typography, strong photography, curation and restraint. A premium feel without clutter. | An exclusive tone that would put off casual cafe customers. |
| SevenRooms | Venue-side operations and guest data | Fast staff actions, clear reservation status, guest notes and tags | Enterprise complexity. FeenGo's dashboard must stay phone-simple. |
| Eat App | Reservations in the Gulf region, with Arabic support and a host app | Regional expectations, WhatsApp-style confirmations, right-to-left booking widgets, a host-stand tablet layout | Gulf-specific tone that does not fit Egypt |
| Dineout (Swiggy) | A price-sensitive market similar to Egypt | Occasion and collection tiles ("date night", "birthdays"), local discovery | Discount-led positioning. FeenGo is free for a year and is not a coupon app. |
| TheFork | Reservations with strong search | Filters, and switching between list and map (C-06) | Heavy discount badges |
| Google Maps | Where Egyptians already look up places | Information order on a place page: hours, location, photos, reviews. Customers will compare FeenGo's venue page with it. | Competing on map features. Link out for directions. |
| elmenus (Egypt, verify) | Local restaurant discovery and menus that customers already know | Local content patterns, menu display, Arabic and English copy tone for Egypt | Being a menu directory. FeenGo's value is the booking. |
| Talabat (Egypt) | The most familiar Egyptian consumer app | Area pickers, phone sign-in, right-to-left execution at scale, local trust signals | Busy, promotion-heavy screens |
| Careem | High-quality Arabic and English product | Right-to-left layout done well, status timelines, a calm bilingual tone | Super-app breadth |
| Breadfast (Egypt, verify) | A polished Egyptian consumer brand | A friendly, local, bilingual brand voice | |
| Instagram and WhatsApp | Where venues market today and where bookings happen informally | Photo-first browsing. Sharing to WhatsApp must look good, with a link preview image and title. WhatsApp code sign-in is familiar. | |
| Airbnb and Booking.com | Requests, deposits and cancellation policies at scale | Explaining a cancellation policy in plain words before payment (C-07, C-12). Trust and receipts. | |
| Arabia Weddings (Egypt, verify) | Local event and wedding vendor directories | What customers expect from request-for-quote: packages, budget ranges, site visits | Directory clutter |
| Shopify mobile admin, Square Dashboard | Business tools used on phones | Phone-first patterns for owners and staff: lists, quick actions, bottom navigation | |
| Stripe Dashboard | Back-office reference | Tables, filters, detail pages, audit history, careful destructive actions (admin) | |

Owner action: add the two or three local apps your customers and venue staff use most. Then mark any product above that is irrelevant.

---

## 4. Visual directions

Three distinct directions, described in words so the owner can react before any visuals are made. Direction A builds on the provisional palette. Each direction applies to all three products, with less brand expression in the partner dashboard and admin.

### Direction A: Warm Evening (builds on the provisional palette)

- **Mood:** a warm evening out in Cairo. Hospitable, social, golden hour. Feels like being welcomed at a good restaurant.
- **Colour:** raspberry (#B3204F family) for primary actions and brand moments. Saffron (#F2A93B family) as a highlight for ratings, featured badges and celebration, always as a fill with dark text. Deep teal (#0E6B5E family) for success and confirmed states. Cream backgrounds in light mode and deep slate in dark mode. Colour is used generously but with discipline: one primary colour per screen.
- **Typography:** a humanist sans with warm, open shapes in medium and semibold weights. Pairing 1 or 3 in section 6.
- **Imagery:** real venues in warm natural or evening light, people mid-conversation, food close-ups, one consistent warm colour grade. No stock-photo smiles.
- **Iconography:** rounded outline icons at about 1.75 px stroke, filled when selected. Soft corners on cards and buttons (about 12 to 16 px radius).
- **Strengths:** builds on what exists, so the provisional tokens carry forward. Warm and broadly appealing across cafes and upscale places.
- **Risks:** raspberry sits close to error red, so error states need their own colour plus icons. Saffron cannot be used for text on light backgrounds. Cream can look dated if surfaces are not crisp. Dark mode needs lighter variants of every brand colour (section 8).

### Direction B: Quiet Luxury

- **Mood:** calm, premium, a concierge. Suits upscale places and serious events.
- **Colour:** mostly ink and warm off-white, one deep accent (for example a Nile green or deep blue) and a restrained metallic tone (brass or gold) for small details. Photography carries the colour, and the interface stays quiet.
- **Typography:** an elegant display face for headlines, a serif in Latin with a matching Naskh-style Arabic, and a clean sans for all interface text. Display fonts are never used below headline size.
- **Imagery:** moody interiors, architecture, table settings and low-key lighting, with fewer people. Editorial framing.
- **Iconography:** thin, precise line icons, small radii (about 4 to 8 px) and hairline dividers.
- **Strengths:** distinctive in Egypt. Builds trust for high-value events and deposits. Ages well.
- **Risks:** may feel exclusive or expensive to everyday cafe customers. Thin lines and small type struggle in sunlight and at large text sizes. Gold on light backgrounds fails contrast. Serif Arabic display needs careful testing at small sizes.

### Direction C: Cairo Night Out

- **Mood:** energetic, young, social. Plans with friends, celebration, the city at night.
- **Colour:** one saturated hero colour (for example electric coral or violet) with a bright secondary colour, bold colour blocks, and a confident dark mode as a signature.
- **Typography:** a geometric sans with character in heavy headline weights. Alexandria, by Egyptian type designer Mohamed Gaber, is a natural fit (section 6).
- **Imagery:** candid, flash-lit photos of groups and celebrations, plus a small set of illustrated "stickers" for occasions (cake, ring, briefcase).
- **Iconography:** chunky rounded icons, filled or duotone, with pill shapes and large radii (20 px or more).
- **Strengths:** memorable, social and shareable. Strong appeal to the 18 to 30 group.
- **Risks:** can undercut trust for upscale venues and for deposits. Trends date quickly. Illustrations add cost and must exist for every occasion in both languages. Bright fills often fail contrast with white text.

### How to choose

| If the owner answers... | Lean towards |
| --- | --- |
| "Friendly neighbourhood host", broad appeal, keep momentum | A |
| "Polished concierge", upscale and events first | B |
| "Fun friend who knows every place", young and social first | C |

A blend is possible, for example A's colour with B's restraint. Choose one direction as the base so the design system has a single logic.

---

## 5. Logo and app icon brief

### The name

- **FeenGo**, always with a capital G, so it is never read as "Fingo". The two parts, "Feen" (where) and "Go", should be visible in the wordmark, for example through the capital G, a change in weight or colour on "Go", or the spacing.
- Pronunciation: "feen" rhymes with "seen", then "go".

### The Arabic name (owner to confirm)

Arabic has no capital letters, so the capital-G device does not carry over. Options:

| Option | Reads as | Notes |
| --- | --- | --- |
| فين جو | "feen go", two words | Mirrors the meaning and the split. In Egyptian Arabic ج is pronounced as a hard g, so it reads correctly for the core market. Outside Egypt it may be read "feen jo". |
| فينجو | One word | Shorter, but loses the "where to go" split, like "Fingo" in English |
| Latin "FeenGo" in both languages | | Common for Egyptian brands. Simplest, but the Arabic store listing and Arabic screens then carry a Latin name. |

The owner also confirms how the name appears under the app icon and in the Arabic store listing.

### What to design

1. **English wordmark**, "FeenGo".
2. **Arabic wordmark**, drawn to match the English one in weight, visual size and rhythm, not just typed in a font. Arabic needs more vertical space for its ascenders and descenders, so match the visual size of the two, not the point size.
3. **Lockups:** English horizontal, Arabic horizontal, a bilingual lockup (stacked or side by side), and the symbol alone.
4. **Symbol or monogram** that works at app-icon size without the wordmark. Ideas to explore, not prescriptions: a question of place ("feen?") combined with movement ("go"), the G as a destination marker, a door or table as a sign of welcome. Avoid copying a generic map pin, which is close to Google Maps and many local apps.

### Requirements for the symbol

- Recognisable at 16 px (browser tab), 24 dp in a single colour (Android notification icon), 29 pt (smallest iOS icon) and 48 dp (Android launcher).
- No text and no wordmark inside the app icon.
- No hairlines. Strokes must survive being reduced to 16 px.
- Works in full colour, in one colour, reversed on dark, and as a silhouette (Android themed icons, iOS tinted icons).
- Distinguishable from existing marks. Before final approval, the owner commissions a trademark search in Egypt.

### iOS icon requirements

- One 1024 × 1024 px master on a square canvas. The system applies the rounded mask, so the corners are not pre-rounded. The default appearance has no transparency.
- iOS 18 and later offer **dark** and **tinted** appearances. iOS 26 renders icons with Liquid Glass and adds **clear** appearances. Apple's Icon Composer builds one layered icon file that covers default, dark, clear and tinted, so the icon should be designed as separate layers (background plus one or two foreground layers).
- Devices on iOS 15 to 17 (Q-02 supports iOS 15 and later) show the flattened default icon, so it must work on its own.
- The App Store uses the same 1024 px artwork.

### Android icon requirements

- **Adaptive icon** (Android 8 and later, which matches Q-02): a foreground layer and a background layer, each 108 × 108 dp. Only the central 72 × 72 dp is visible, and launchers apply different masks (circle, squircle, rounded square) and may move the layers slightly. Keep the essential shape inside a central circle 66 dp across.
- **Themed icon** (Android 13 and later): a monochrome layer on the same 108 dp canvas. The system colours it to match the wallpaper, so it must read as a single-colour silhouette.
- **Notification icon:** 24 × 24 dp, white on transparent, silhouette only. Android ignores its colour. Needed when push arrives (C-18).
- **Android 12+ splash screen:** uses the app icon. An icon without a background plate is 288 × 288 dp and must fit inside a 192 dp circle. With a background plate it is 240 × 240 dp inside a 160 dp circle.
- **Google Play listing icon:** 512 × 512 px, 32-bit PNG, up to 1024 KB, full square. Google Play applies the mask.
- Google Play also needs a 1024 × 500 px feature graphic, designed with the store listing before the public release.

### Web and other surfaces

- Partner dashboard and admin: an SVG favicon plus a 32 px PNG, a 180 × 180 px Apple touch icon, and web-manifest icons at 192 px and 512 px, including a maskable 512 px version with the symbol inside the central 80% circle. The partner dashboard will be added to staff home screens, so this matters.
- WhatsApp Business profile picture for the one-time-code sender (C-02, from S1): square, about 640 × 640 px, shown in a circle. Testers see it from S1 onwards.
- Email header logo for venue alerts (P-10), and a link-preview image for shared venue links (C-08).

### Light and dark legibility

- The wordmark comes in four versions: full colour on light, full colour adjusted for dark, one colour dark, and one colour light (reversed).
- Wherever the logo carries meaning, it reaches at least 3 to 1 contrast against its background.
- The icon is checked on light and dark wallpapers, in dark and tinted modes, and as a themed icon on a real Android phone.

### Deliverable formats

- Master vector source files, in the design tool and as SVG with all text converted to outlines.
- SVG for web and app use, and PDF for print.
- PNG exports at every size listed above.
- The Icon Composer file for iOS, and separate SVG layers for the Android foreground, background and monochrome icons.
- A one-page usage guide: clear space, minimum sizes, colour values (HEX, RGB, CMYK, and Pantone if print matters), and examples of correct and incorrect use.
- A written transfer of all rights in the logo to the company. If a font is used in the logo, its licence must allow logo use. The Open Font License allows it.

---

## 6. Typography

### What the fonts must do

- Cover Latin and Arabic with matching visual weight and size, so a screen does not change character when the language switches.
- Offer at least regular, medium, semibold and bold weights.
- Include Western digits (0 to 9) and Arabic-Indic digits (٠ to ٩).
- Offer equal-width (tabular) digits for one-time-code boxes, times, prices and dashboard tables.
- Include ڤ and گ, which Egyptian writing sometimes uses for foreign "v" and "g" sounds in venue names.
- Be free to embed in apps and websites. The Open Font License (OFL 1.1) is preferred.

### Verified pairings

The facts below were checked against the font files published in the Google Fonts repository on 18 November 2026. All fonts listed are OFL 1.1.

| | Pairing 1: IBM Plex Sans + IBM Plex Sans Arabic | Pairing 2: Inter + Noto Sans Arabic | Pairing 3: Readex Pro (one family for both scripts) |
| --- | --- | --- | --- |
| Character | Rational and humanist, slightly technical. One designed superfamily, so Latin and Arabic match by design. | Neutral workhorses with the best legibility at small sizes. Very widely used. | Friendly, open and rounded. Designed for reading ease (an Arabic extension of Lexend). |
| Weights | Plex Sans: variable, 100 to 700, plus width and italics. Plex Sans Arabic: 7 static weights, 100 to 700. | Inter: variable, 100 to 900, with optical size and italics. Noto Sans Arabic: variable, 100 to 900, with width. | Variable, 160 to 700, with an extra "expansion" axis. No italics. |
| Western digits | Yes, equal width by default | Inter: yes, proportional by default, equal width through the `tnum` feature. Noto: yes, equal width by default. | Yes, proportional, no `tnum` |
| Arabic-Indic digits | Yes, but proportional, with no `tnum` feature | Yes, equal width by default | Yes, proportional, no `tnum` |
| ڤ and گ | Both | Both (Noto) | ڤ only, and پ چ are missing |
| Fits direction | A, or B as the interface font | Any. The strongest choice for the dashboards. | A or C |
| Watch out for | No equal-width Arabic-Indic digits, so code boxes and time columns need fixed-width cells if those digits are used. Strong association with IBM. | Generic. Two families from different designers need size and line-height tuning per script. | Proportional digits in both scripts. Missing letters for some loan words. |

The ROADMAP sets IBM Plex Sans Arabic for both languages. That font contains Plex's Latin letters, so it works in S0. Now that English leads, the Latin face should be chosen on its own merits. Pairing 1 keeps continuity at no cost.

Also considered:

- **Alexandria** (OFL, variable 100 to 900, Arabic and Latin, `tnum` available, by Egyptian designer Mohamed Gaber). A strong display or brand face for direction C, or for headlines in A.
- **Cairo** (OFL, variable 200 to 1000). Very widely used in the region, so less distinctive. No `tnum`.
- **Tajawal** (OFL, 7 weights). Small character set and no `tnum`. Not recommended.
- **Commercial Arabic families** from specialist foundries are an option for a more distinctive brand. They need paid app and web embedding licences, so compare the cost before choosing.

### Typography rules, whatever the pairing

- Arabic needs more line height than Latin, about 1.5 to 1.6 against 1.3 to 1.4, and often one step larger at body sizes for the same visual size. The type tokens therefore carry values per script.
- Never add letter spacing to Arabic, because it breaks letter joining. Never use italics for Arabic emphasis. Use weight instead.
- Avoid all-capitals in English interface text. Arabic has no equivalent, so it breaks parity between the languages.
- Owner decision, needed for S1: in Arabic screens, are numbers shown as Western digits (0 to 9) or Arabic-Indic digits (٠ to ٩)? The recommendation is Western digits for phone numbers, codes, prices and times in both languages. They match the code in the WhatsApp or SMS message, receipts and Paymob. Whatever is shown, number fields must accept both digit sets from the keyboard.

---

## 7. Imagery, photography and icons (applies to every direction)

- Venue photos come from venues (P-03), so quality will vary. The design must look good with imperfect photos: consistent crops (fixed aspect ratios), gentle overlays for text on images, and a well-designed fallback when a photo is missing.
- FeenGo's own photography and illustrations (onboarding, empty states, store listing) follow the chosen direction.
- Use one icon set with outline and filled variants, from an open-licence library if possible, extended with custom icons for occasions. Icons that show direction (back, forward, arrows) mirror in Arabic. Icons that show real objects (clock, phone, camera, play) do not.

---

## 8. Provisional palette review

Measured with the WCAG 2.x formula. These figures match the owner's measurements.

| Pair | Ratio | Body text (4.5) | Large text and UI parts (3.0) |
| --- | --- | --- | --- |
| Dark neutral #1C2430 on Light neutral #FBF6EE (and the reverse) | 14.52 | Pass | Pass |
| Primary #B3204F on Light | 6.03 | Pass | Pass |
| Primary on Dark | 2.41 | **Fail** | **Fail** |
| White on Primary | 6.49 | Pass | Pass |
| Light neutral on Primary | 6.03 | Pass | Pass |
| Success #0E6B5E on Light | 5.94 | Pass | Pass |
| Success on Dark | 2.44 | **Fail** | **Fail** |
| White on Success | 6.40 | Pass | Pass |
| Accent #F2A93B on Light | 1.86 | **Fail** | **Fail** |
| White on Accent | 2.00 | **Fail** | **Fail** |
| Dark neutral on Accent | 7.82 | Pass | Pass |
| Accent on Dark | 7.82 | Pass | Pass |

### What this means

1. **Filled buttons work in both modes.** White on Primary (6.49) and white on Success (6.40) pass on any background, because the fill carries its own contrast.
2. **Primary and Success fail as text, icons or outlines in dark mode** (2.41 and 2.44). They also fail the 3 to 1 rule for a button's edge or a selected state against the dark background. Dark mode needs lighter variants. On #1C2430, a colour needs a relative luminance of at least 0.253 for 4.5 to 1, or 0.152 for 3 to 1. For scale only, not as a proposal: mixing 34% white into Primary (#CD6C8B) just reaches 4.55. The final dark-mode colours will be tuned by hue and saturation, not mixed.
3. **Accent is a dark-mode colour and a fill colour.** It fails as text or icons on light backgrounds (1.86) and with white text (2.00). It passes with dark text (7.82) and as text on dark (7.82). In light mode, use it only as a fill under dark text, or as decoration that carries no meaning. A darker accent that passes on light (for example #916523, 4.77) becomes brown, so a separate role is better than darkening the brand colour. Rating stars in Accent on a light background (1.86) would fail and need an outline or a different colour.
4. **Primary and Success have almost the same lightness** (6.03 and 5.94 on light). For people with red-green colour blindness they can look alike. Status must never rely on colour alone: every status shows text and an icon.
5. **Primary is close to error red.** Error states need their own colour, clearly different from the brand raspberry, plus an icon and a text message.
6. **Every text role needs two values.** For example, the grey #5B6470 reaches 5.57 on light but only 2.60 on dark.

### What the final palette needs

- **Semantic roles, not raw colours.** Surface, raised surface, on-surface, secondary text, outline, divider, primary, on-primary, primary container, on-primary container, accent and on-accent, success, warning, error and info with their "on" colours, focus ring, overlay, disabled, and skeleton loading. Each role has a light value and a dark value.
- **On-colour pairs.** Every background role is published with its text colour, and the pair is tested.
- **Status colours** for every booking status in the PRD: Pending, Confirmed, Declined, Expired, Cancelled by customer, Cancelled by venue, Attended, No-show, Requested, Quoted, Awaiting deposit and Completed. Each status has a colour, an icon and a label, and the same set is used in the app and the dashboard.
- **Neutral scale** with enough steps for raised surfaces in dark mode, where elevation is shown by lighter surfaces, not shadows.
- **An automated contrast check** in the token build, so a failing pair cannot be published. This is a later task for ui-ux-designer, with a tool to be agreed with the architect.
- **Mapping rule for builders:** themes map each role to its token explicitly. Generating a scheme from a seed colour (for example Flutter's `ColorScheme.fromSeed`) would silently replace the approved values.

Colours are **not** final. The final palette is chosen in phase 4 of `docs/design/plan.md`, after a visual direction is chosen.

---

## 9. Owner decisions from this brief

| # | Decision | Needed before |
| --- | --- | --- |
| 1 | Arabic digits: Western or Arabic-Indic in Arabic screens | S1 build (phone and code screens) |
| 2 | Arabic voice and gender-neutral copy | S1 build (every Arabic string) |
| 3 | Arabic name, and the name under the app icon in Arabic | S1 testers (WhatsApp sender); final before the public release |
| 4 | Brand personality: answers to section 2 | Phase 2 |
| 5 | Reference apps: additions and removals in section 3 | Phase 2 |
| 6 | Visual direction A, B or C | Design system (phase 4) |
| 7 | Typography pairing | Design system (phase 4) |
| 8 | Who designs the logo (owner, freelancer or agency), and approval of the logo brief in section 5 | Phase 3 |
