# Category Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users create, rename, and delete categories, with an explicit choice about updating old transactions.

**Architecture:** Reuse the existing modules state and generic modal. Add category rows/actions to the existing limits/categories templates and implement category edit/delete behavior in `js/ui/modules.js`.

**Tech Stack:** Vanilla JavaScript modules, existing Firestore transaction documents, existing generic modal markup.

---

## File Structure

- Modify `js/ui/modules.js`: add category edit UI, delete options, and helper to update old transactions.
- Modify `js/main.js`: expose `editCategory` globally for inline buttons.
- Modify `js/ui/desktop-module-templates.mjs`: add edit/delete actions to category cards.
- Modify `js/ui/mobile-module-templates.mjs`: render categories inside mobile limits page.
- Modify `css/main.css`: add light styling for category management rows.

### Task 1: Category Actions

- [ ] Add `editCategory(id)` and update `removeCategory(id)` in `js/ui/modules.js`.
- [ ] Add helper `updateTransactionsCategory(from, to)` that updates matching loaded transactions with `updateDoc`.
- [ ] Preserve old transactions unless the user checks the update option.

### Task 2: Category UI

- [ ] Add edit/delete buttons in desktop category cards.
- [ ] Add mobile category list below limits in `renderMobileLimitsModule`.
- [ ] Expose `editCategory` in `js/main.js`.

### Task 3: Verification

- [ ] Run `node --check js/ui/modules.js`.
- [ ] Run `node --check js/main.js`.
- [ ] Run `node --check js/ui/desktop-module-templates.mjs`.
- [ ] Run `node --check js/ui/mobile-module-templates.mjs`.
- [ ] Confirm `http://localhost:5173` returns `HTTP 200`.

## Self-Review

- Spec coverage: create, rename, delete, and old transaction update choices are covered.
- Placeholder scan: no placeholders remain.
- Type consistency: category IDs, names, and transaction `cat` fields match existing code.
