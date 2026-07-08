# Mobile Material Neon Design

## Context

The previous mobile premium polish still used a green financial-app identity. The desired direction is now closer to a Material Design financial app using a strict dark neon palette:

- Neon Blue: `#29D6FF`
- Medium Blue: `#12384D`
- Dark Blue: `#081522`
- Black: `#000000`
- White: `#FFFFFF`

## Decision

Update the mobile `Inicio` and `Transacoes` screens to a Material dark neon visual language. The app should stop using green as a primary identity color. Neon blue becomes the main action/accent color, medium blue becomes the card/surface color, dark blue and black become the background layers, and white remains the text/high-contrast color.

## Goals

- Make the mobile app feel closer to Material Design: rounded surfaces, clear elevation, chips, filled controls, and a prominent FAB.
- Use the provided palette as the visual identity.
- Remove green as the dominant color from mobile surfaces, summary cards, nav active states, FAB, and transaction cards.
- Keep existing behavior unchanged: Firebase, navigation, filters, transactions, totals, categories, modals, and dates.
- Keep focus on mobile `Inicio` and `Transacoes`.

## Visual Direction

- Background: black/dark blue layered page background.
- Surfaces: medium blue cards with subtle neon blue outlines or glows.
- Primary action: neon blue FAB, selected nav, chips, focused inputs, and key accents.
- Text: white for primary content, white with opacity for secondary content.
- Financial meaning: use labels, signs, icons, and hierarchy rather than green as a positive color. Expenses should not require a green/red palette to be understandable.

## Components

### Inicio

- Topbar becomes a dark Material app bar with subtle blur and blue surface tone.
- Month selector and dashboard filter become pill-shaped Material chips.
- Summary cards use medium-blue surfaces with neon blue icon circles and clear value hierarchy.
- Chart, heatmap, and stats cards use consistent Material rounded containers.

### Transacoes

- Search/filter area becomes one Material toolbar surface.
- Inputs use filled dark-blue treatment with neon focus ring.
- Transaction cards use medium-blue Material cards, neon icon containers, and compact metadata chips.
- Edit/delete controls remain tappable and visually quieter.

### Navigation And FAB

- Bottom nav becomes a floating dark Material navigation bar.
- Active tab uses neon blue filled/tonal state.
- FAB becomes neon blue with Material elevation.

## Constraints

- Prefer a final mobile CSS override to avoid destabilizing desktop.
- Preserve IDs, JavaScript hooks, rendered markup, and existing interaction behavior.
- Do not add new product features in this iteration.

## Verification

- Load `http://localhost:5173` and confirm HTTP 200.
- Open localhost for manual review.
- Review mobile `Inicio` and `Transacoes` after the final CSS override is applied.
