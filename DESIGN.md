---
version: alpha
name: DriveEase
description: An automotive travel journal with clear, dependable rental tools.
colors:
  primary: '#203C52'
  background: '#F2F5F6'
  surface: '#FFFFFF'
  muted: '#5E707D'
  accent: '#BE492A'
  line: '#DCE3E7'
  success: '#25634C'
  danger: '#AA3030'
typography:
  display:
    fontFamily: 'Barlow Condensed, Arial Narrow, sans-serif'
  body:
    fontFamily: 'Manrope Variable, system-ui, sans-serif'
rounded:
  DEFAULT: '0.75rem'
  sm: '0.5rem'
  lg: '1.5rem'
spacing:
  page-max: '80rem'
  section-gap: '5rem'
components:
  button: {}
  card: {}
  dialog: {}
  field: {}
  status: {}
---

# DriveEase Design System

## Overview

### Creative North Star

An independent road-trip journal meets a reliable rental counter. The audience rents cars and bikes in India; the primary task is finding an available vehicle and reserving dates. Evidence: README.md, INR pricing and vehicle seeds. English UI, en-IN currency, Gregorian date-only rentals. Hybrid register: the homepage is expressive, rental and operations routes prioritize clarity. No Japan-market evidence.

The signature is the oversized condensed headline paired with a panoramic road photograph and a small journey caption. Avoid generic gradients, floating metric cards, decorative numbering, invented ratings, and cream/serif templates. Keep forms familiar and quiet.

Runtime CSS variables in frontend/src/styles.css are canonical (model B). Frontmatter mirrors the accepted palette. Mapping: colors.* → identically named --* variables; typography.display/body → --font-display/body; rounded.DEFAULT/sm/lg → --radius/--radius-sm/--radius-lg; spacing.page-max/section-gap → --page-max/--section-gap. Shared primitives consume these variables. Verify with npm run test:design.

## Colors

Deep blue primary for text and actions, mist background, white surface, cool muted text and line. Burnt orange accent for the principal discovery action. Success and danger retain semantic meaning with text labels. Light theme only; forced colors preserves system focus and scrollbar visibility.

## Typography

Barlow Condensed carries large editorial headings, used in sentence case. Manrope carries controls and body text. Self-hosted Latin variable fonts, system fallbacks, body line-height 1.65. Data uses tabular numerals. Body starts at 14–16px, headings scale responsively; avoid text baked into imagery.

## Layout

80rem page maximum, 32px desktop gutters, 20px phone gutters; 5rem section rhythm. Three-column vehicle grid becomes two then one; booking details use an image/summary column and form column. Document owns vertical scrolling; tables own horizontal overflow only. Header wraps to retain mobile navigation. Images reserve aspect ratio. Busy controls retain width.

## Elevation & Depth

Use tonal surfaces and fine borders. Small shadow only for the booking search bar and modal. No decorative glow or glass. Dark image overlays exist only for readable image captions.

## Shapes

12px control/card radius, 8px compact controls, 24px hero radius. Rounded status pills carry explicit labels. Thin line icons use lucide-react at 18–22px with consistent stroke width.

## Components

Buttons: brand solid, neutral outline/ghost and danger outline/final solid; hover darkens, focus uses a visible outline, active translates 1px, disabled loses opacity and pointer. Pending state exposes aria-busy with a fixed-width label. Shared Field owns labels and inline errors; native selects and date inputs deliberately accept OS popup geometry and calendar locale. Search uses explicit submit and clear. Modal uses native dialog.showModal for focus isolation, Escape and focus restoration. Status uses shared live-region feedback, with persistent inline errors for failures. Tables use native semantics, pagination, and responsive overflow.

Seeded vehicle photography must depict the named model. `database/fleet.json` owns model-photo pairing and attribution; `npm run sync:fleet` generates SQL and frontend credits. VehiclePhoto is the shared card/detail owner. Use local WebP assets and show the whole image with contain, never substitute an unrelated road or vehicle after an image error. Model reference photos do not claim to show the exact rental unit.

Motion is restrained to 160ms color/transform feedback, disabled under prefers-reduced-motion. Product voice uses concrete actions. Payment is explicitly simulated; do not imply real money processing, insurance, delivery, or unsupported service guarantees.

## Do's and Don'ts

- Do keep the road image and typography as the memorable gesture.
- Do use shared fields, state messages, dialogs and cards across routes.
- Don't fabricate social proof or vehicle specifications.
- Don't use native alert/confirm/prompt or hide mobile navigation.
