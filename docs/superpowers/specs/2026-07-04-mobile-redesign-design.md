# Mobile Redesign Design

## Context

The app is used on mobile and should feel more polished and intuitive. The visual reference uses a light financial dashboard style with soft cards, strong green accents, clean bottom navigation, and readable transaction cards.

## Decision

Redesign the mobile experience first while preserving desktop behavior and structure as much as possible.

## Goals

- Make the mobile UI feel lighter, cleaner, and more trustworthy.
- Improve scanability of balance, income, expenses, and transaction cards.
- Make the primary add action easier to find by emphasizing the floating `+` action.
- Keep existing data flow, Firebase behavior, navigation functions, modals, and transaction actions unchanged.

## Mobile Visual Direction

- Use a warm light background and white cards with soft borders and shadows.
- Use green as the main brand/action color and red only for expenses or destructive states.
- Replace the current heavy centered balance feel with clearer summary cards.
- Make the topbar compact and app-like, with a brand/title area and small controls.
- Make the bottom navigation feel like a native app tab bar, with the floating add button centered above it.
- Make transaction cards closer to the reference: rounded white cards, clear title/value hierarchy, metadata under the title, and small edit/delete actions.

## Scope

This redesign targets mobile screens first. Desktop should remain visually and structurally close to the current version except where shared components naturally inherit small improvements.

## Implementation Notes

- Prefer CSS changes under mobile media queries to reduce desktop risk.
- Add small mobile-specific markup only where CSS cannot express the desired layout.
- Do not change authentication, Firebase persistence, transaction filtering, deletion confirmation, or modal behavior.

## Testing

- Verify the app loads at mobile width.
- Verify bottom navigation switches pages.
- Verify the floating `+` opens the add menu and transaction modal.
- Verify transaction edit/delete buttons remain usable.
- Verify the desktop layout is not substantially changed.
