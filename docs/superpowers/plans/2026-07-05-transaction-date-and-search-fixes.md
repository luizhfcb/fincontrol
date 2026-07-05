# Transaction Date And Search Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add transaction date selection, rename the mobile limits tab to categories, and fix search clearing.

**Architecture:** Reuse the existing transaction modal and add one native date input. Pass the selected date into `saveTransaction()` so the service sets `date`, `month`, and `year` consistently for creates and edits.

**Tech Stack:** Vanilla HTML, CSS, JavaScript modules, Firebase Firestore.

---

## File Structure

- Modify `index.html`: add date input to the transaction modal and rename mobile nav label.
- Modify `js/ui/modal.js`: initialize, fill, validate, and submit the date field.
- Modify `js/services/transactions.js`: accept selected date and save month/year from it.
- Modify `js/ui/render.js`: make search clear update visible input values.

## Tasks

- [ ] Add `<input id="mDate" type="date">` to the transaction modal.
- [ ] Default new transactions to today's date.
- [ ] Fill `mDate` with the original date when editing.
- [ ] Update `saveTransaction(description, value, type, category, dateValue)` to persist `date`, `month`, and `year` from the selected date.
- [ ] Change mobile nav text from `Limites` to `Categorias`.
- [ ] Update `setTxSearch('')` to clear all `.tx-search-input` values.
- [ ] Run `node --check js/ui/modal.js`.
- [ ] Run `node --check js/services/transactions.js`.
- [ ] Run `node --check js/ui/render.js`.
- [ ] Confirm `http://localhost:5173` returns `HTTP 200`.

## Self-Review

- Spec coverage: date create/edit, nav label, and search clear are covered.
- Placeholder scan: no placeholders remain.
- Type consistency: date input uses `YYYY-MM-DD`; saved transaction still stores ISO `date`, numeric `month`, and numeric `year`.
