# Expense Heatmap And Time Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix transaction time persistence and add an expense heatmap to the overview.

**Architecture:** Keep the existing vanilla JS renderer. Add heatmap containers to `index.html`, compute daily expense totals from already-loaded monthly transactions in `render.js`, and render interactive details in-place.

**Tech Stack:** Vanilla HTML/CSS/JavaScript modules, Firebase Firestore via existing listeners.

---

## Tasks

- [ ] Fix `saveTransaction()` to combine the selected date with the current time for new transactions and the original time for edits.
- [ ] Add mobile and desktop heatmap containers in the overview.
- [ ] Add `state.heatmapSelectedDay`.
- [ ] Implement daily expense aggregation, red intensity calculation, heatmap rendering, and selected-day details.
- [ ] Expose `selectExpenseHeatmapDay(day)` globally.
- [ ] Add CSS matching the current card style.
- [ ] Verify with `node --check` and localhost.

## Self-Review

- Covers the time bug and requested heatmap behavior.
- No React is added because the app is not React-based.
- No placeholders remain.
