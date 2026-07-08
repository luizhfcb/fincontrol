# Mobile Material Neon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the mobile `Inicio` and `Transacoes` visual direction to a Material dark neon interface using the provided blue/black/white palette.

**Architecture:** Add one final mobile-only CSS override at the end of `css/main.css`. The override supersedes the previous green premium polish without changing markup, JavaScript, Firebase behavior, navigation, filters, or transaction data flow.

**Tech Stack:** Plain HTML, CSS, JavaScript modules, static local server via Python.

---

## File Structure

- Modify: `css/main.css` for final Material neon mobile override.
- Do not modify: `index.html`, `js/ui/render.js`, transaction services, Firebase config, or module templates.
- Verify: `http://localhost:5173` returns HTTP 200 and opens for manual mobile review.

## Task 1: Add Material Neon Mobile Override

**Files:**
- Modify: `css/main.css`

- [ ] **Step 1: Append a final mobile CSS override**

Append a new `@media (max-width: 767px)` block after the existing final mobile block. It must define the supplied palette, force mobile surfaces into Material dark neon styling, replace green identity uses with neon blue, and keep financial distinction through text/signs/icons rather than green.

- [ ] **Step 2: Keep scope mobile-first**

Ensure selectors target mobile elements only and do not restructure desktop.

## Task 2: Verify And Open Localhost

**Files:**
- No file changes.

- [ ] **Step 1: Check local HTTP response**

Run: `Invoke-WebRequest -UseBasicParsing http://localhost:5173 -TimeoutSec 10`

Expected: status code `200`.

- [ ] **Step 2: Open the app**

Run: `Start-Process "http://localhost:5173"`

Expected: browser opens the local app for manual evaluation.

## Self-Review Notes

- Spec coverage: palette, Material dark styling, `Inicio`, `Transacoes`, bottom nav, FAB, and verification are covered.
- Scope: CSS-only mobile override; no behavior changes.
- Git note: commits are unavailable because this directory is not a Git repository.
