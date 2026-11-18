# FeenGo decisions

A running log of decisions, newest first. Add an entry whenever something significant is decided, so it is not argued again. Each entry says what was decided and why.

## 2026-11-18: The app is called FeenGo

"Feen" (where) plus "Go": "where to go?" in Egyptian Arabic and English. Always written with a capital G, so it is not read as "Fingo".

## 2026-11-18: The tech stack is confirmed

Flutter, NestJS, PostgreSQL with PostGIS, Redis, Next.js, Paymob, Firebase, Google Maps, AWS, GitHub Actions. Details in `docs/STACK.md`.

## 2026-11-18: Build and release one feature slice at a time

Slices S0 to S7 in `docs/ROADMAP.md`. Each slice ships to testers. The first public release follows S6.

## 2026-11-16: Booking rules are settings, not code

Booking windows, cancellation policies, deposits, confirmation mode, no-show limits, commission and fees are all stored settings with admin limits and venue choices. The right values will only be known after talking to venues.

## 2026-11-16: Only venues that agree are listed

No scraped listings. Each venue signs up, accepts the partner agreement and is approved before it appears.

## 2026-11-16: Free first year

No subscriptions or fees for venues or customers for about 12 months after launch. The billing structure exists in the database from the start but is switched off.

## 2026-11-16: Payments through Paymob, not store in-app purchase

Bookings and events are real-world services, so they are paid through Paymob.

## 2026-11-14: Three products on one backend

A Flutter customer app, a Next.js partner dashboard and a Next.js admin back office, all on one NestJS API.

## 2026-11-14: Two booking flows

Instant booking for tables, and request-for-quote for events. Both are in the data model from the start.
