# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two distinct audiences:
- **Organizers** (primary, admin side): the person planning a private family event (baptism, birthday, wedding) — building the guest list, tracking RSVPs, assigning meals, and arranging seating. Currently a single organizer per event, authenticated via a shared password (no per-user accounts yet). Confirmed as the eventual product audience: eventGO is meant to serve other organizers/families in the future, not only its current owner.
- **Guests** (public side): invited families who open a personal link to view the invitation, confirm attendance, and select a meal for each guest.

## Product Purpose

eventGO is a digital invitation and guest-management tool for private family celebrations (baptisms, birthdays, weddings). It replaces paper invitations and spreadsheet-based guest tracking with a public invitation page per event plus an admin panel for managing families, RSVPs, meal choices, and table seating.

## Positioning

Confirmed intent: eventGO is meant to grow beyond its current owner into a product other event organizers use for their own celebrations — not a permanently bespoke, single-family tool. The data model (Event with slug/title/celebrantName/subtitle/quote/hero imagery, independent of any one family) already supports this; it is not yet built as a multi-tenant product (no per-organizer accounts, one shared admin password), but future work should not assume the current content (Gael's baptism/birthday) is permanent or hardcode against it.

## Operating Context

- **Guest RSVP flow**: guests open `/e/[slug]` from a shared link (often via WhatsApp), confirm attendance for their family, and pick meals per guest. Mobile-first — most guests will be on a phone.
- **Admin guest/RSVP management** (`/admin`): the organizer reviews confirmations, meal counts, and family details. Used across both desktop and mobile at different points.
- **Seating planning** (`/admin/mesas/[eventId]`): confirmed as a desktop-first, unhurried task — the organizer sits down with a laptop/PC, days or weeks before the event, and drags confirmed families onto tables. Not a same-day, on-the-fly mobile task today.
- Content and UI copy are in Spanish (Mexico); phone numbers are formatted as Mexican numbers.

## Capabilities and Constraints

- Public invitation page per event: hero, itinerary, family/parents/godparents info, gift registry, countdown, RSVP form.
- Guest RSVP: per-guest attendance + meal type (adult/child), with a public link per family (`/e/[slug]?f=[familyRsvpSlug]`).
- Admin: password-gated (single shared password via `ADMIN_PASSWORD`, not per-user accounts), family/guest CRUD, KPI dashboard, CSV export, WhatsApp deep-link invitations, seating planner (drag-and-drop via `@dnd-kit`).
- Data model already supports multiple simultaneous events per install (current account manages two: a baptism and a birthday).
- Undecided: no per-organizer accounts/tenancy yet; no payment/subscription model; no multi-language support.

## Brand Commitments

- Product name: **eventGO**.
- The public invitation side has an established "boutique" identity: warm cream/sage/gold palette, serif display type (Cormorant Garamond), tracked-out uppercase labels — confirmed durable for the public-facing invitation.
- **Mamá (pink) / Papá (blue) side color-coding is a confirmed durable convention** for organizing families/guests by side of the family — the seating planner and any related views must preserve this distinction (not necessarily the exact hex values, but the two-side color-coded categorization).
- The admin panel's own visual system is mid-transition (see Evidence on Hand) — not yet a locked brand commitment.

## Evidence on Hand

- Real, in-production event data: two live events for the same family (a baptism and a 1st-birthday), with real guest lists, real RSVPs, and real uploaded photos under `public/uploads/`.
- Admin panel currently mixes three visual systems on one route (documented in `.impeccable/critique/2026-08-19T18-03-52Z__localhost-admin.md`): the original boutique gold/sage look (login screen), a near-black/slate "Metronic-style" system (KPI cards, tables, buttons), and a newly added Metronic (Keenthemes, licensed) admin header — since partially unified toward the slate system in the most recent session.
- The seating planner (`src/components/SeatingPlanner.tsx`, ~800 lines) is a working `@dnd-kit`-based drag-and-drop tool: draggable family cards, droppable tables, side-based color coding, capacity/overflow indication. This is the incumbent implementation the current redesign request targets.

## Product Principles

1. Guests should be able to RSVP and see event details with zero friction, from a phone, without an account.
2. The admin/organizer side prioritizes clarity and speed for a non-technical family member, not power-user density.
3. Side-of-family (Mamá/Papá) is a first-class organizing category throughout the admin experience, not an incidental detail.
4. Public-facing pages carry the boutique, personal-event feel; admin tooling can be more utilitarian, but should still feel like one coherent product, not a generic dashboard template.
5. Real event content (this family's data) is live evidence, not disposable sample data — redesigns must not lose or corrupt it.

## Accessibility & Inclusion

No formally required standard confirmed. The most recent admin critique found and fixed several WCAG AA contrast failures (filter chips, status pills, row metadata) — treat 4.5:1 text contrast as a baseline going forward rather than a one-off fix.
