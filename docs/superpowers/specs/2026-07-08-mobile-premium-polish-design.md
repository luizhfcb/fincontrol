# Mobile Premium Polish Design

## Context

FinControl already has a mobile redesign, category management, transaction date handling, search fixes, and an expense heatmap. The next step is not a full product rebuild. The goal is to make the mobile `Inicio` and `Transacoes` screens feel more premium while preserving the current palette, data behavior, and navigation.

The app is plain HTML, CSS, and JavaScript. There is no package manager or automated test suite in the project. Verification relies on JavaScript syntax checks, loading the local server, and manual browser review.

## Decision

Apply a mobile-first premium polish to the `Inicio` and `Transacoes` screens. Keep desktop stable except for shared styles that naturally inherit small improvements. Refactor visuals primarily through CSS, with only small markup changes if CSS cannot express the intended hierarchy.

## Goals

- Make `Inicio` and `Transacoes` feel more premium without changing the current app flow.
- Preserve the current palette: green for positive/action states, red for expenses/destructive states, blue/accent surfaces where already used.
- Improve hierarchy while keeping the dashboard information-rich.
- Make light and dark themes feel intentionally designed, not one as an afterthought.
- Reduce visual inconsistency caused by stacked overrides and uneven card treatments.

## Non-Goals

- Do not change Firebase, persistence, authentication, transactions, categories, totals, filters, or date behavior.
- Do not redesign desktop in this cycle.
- Do not add new pages, labels, or product features.
- Do not remove existing dashboard information.

## Visual Direction

Use a premium financial-app style: cohesive surfaces, controlled shadows, consistent spacing, and a clearer value hierarchy.

For the light theme, use a soft background with white cards, subtle borders, controlled shadows, green highlights for income/actions, and red only for expenses or destructive actions.

For the dark theme, use layered dark surfaces with subtle blue/green highlights, restrained borders, and enough contrast for values and categories without making the screen feel harsh.

## Components

### Inicio

- Refine the mobile topbar and month summary area to feel compact and intentional.
- Keep summary cards for receita, despesa, and saldo, but make their spacing, borders, icons, and value hierarchy more consistent.
- Make chart and heatmap containers feel lighter and more integrated with the page.
- Keep the recent transactions list, but polish transaction card hierarchy so title, value, category, date, and actions do not compete visually.

### Transacoes

- Present search, filter, and grouping controls as a coherent toolbar rather than disconnected controls.
- Polish transaction cards for better scanability and a more premium feel.
- Improve spacing between the title, toolbar, and list so the page feels deliberate rather than crowded.

### Navigation And Action

- Keep the current bottom navigation and FAB behavior.
- Refine their visual treatment only enough to match the premium mobile polish.
- Do not change labels or navigation destinations.

## Implementation Constraints

- Prefer CSS changes inside mobile-specific sections to reduce desktop risk.
- Consolidate conflicting mobile overrides where practical, but avoid broad unrelated CSS rewrites.
- Preserve existing element IDs and JavaScript hooks.
- Keep edits minimal and focused on `index.html` and `css/main.css` unless a small rendering class adjustment is necessary.

## Verification

- Run JavaScript syntax checks for the touched JavaScript files if any JavaScript changes are made.
- Load the local app on `http://localhost:5173` and confirm it returns HTTP 200.
- Open the local app for manual review.
- Manually review mobile `Inicio` and `Transacoes` in light and dark themes.
