# Mobile Premium Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the mobile `Inicio` and `Transacoes` screens so they feel more premium in both light and dark themes without changing app behavior.

**Architecture:** Apply a narrow CSS override at the end of `css/main.css` under `@media (max-width: 767px)`. Preserve existing IDs, JavaScript hooks, Firebase behavior, navigation, filters, totals, and transaction rendering.

**Tech Stack:** Plain HTML, CSS, JavaScript modules, Firebase client code, Python local static server for verification.

---

## File Structure

- Modify: `css/main.css` for the mobile premium polish override block.
- Do not modify: `index.html`, `js/ui/render.js`, or service files unless visual review reveals a CSS-only solution is impossible.
- Verify: load `http://localhost:5173` after serving the project locally.

## Task 1: Add Mobile Premium Theme Tokens And Surfaces

**Files:**
- Modify: `css/main.css`

- [ ] **Step 1: Append a scoped mobile override block**

Add this block after the final existing mobile override in `css/main.css`:

```css
/* Mobile premium polish: Inicio + Transacoes */
@media (max-width: 767px) {
  [data-theme="light"] {
    --bg:#f5f7f2;
    --bg2:#ffffff;
    --bg3:#edf3ec;
    --card:#ffffff;
    --card2:#f7faf5;
    --surface:#ffffff;
    --border:rgba(24,45,33,.085);
    --border2:rgba(20,154,79,.22);
    --text:#26312a;
    --text2:rgba(38,49,42,.64);
    --text3:rgba(38,49,42,.42);
    --accent:#16b85d;
    --accent-strong:#078541;
    --accent-bg:rgba(22,184,93,.095);
    --green:#08964a;
    --green-bg:rgba(8,150,74,.105);
    --red:#d73a44;
    --red-bg:rgba(215,58,68,.09);
    --shadow-soft:0 14px 34px rgba(31,52,39,.085);
  }

  [data-theme="dark"] {
    --bg:#07111d;
    --bg2:#0b1624;
    --bg3:#111f31;
    --card:#0f1b2c;
    --card2:#142238;
    --surface:#101d2f;
    --border:rgba(151,188,229,.105);
    --border2:rgba(92,199,136,.24);
    --text:#e8f1fb;
    --text2:rgba(232,241,251,.68);
    --text3:rgba(232,241,251,.44);
    --accent:#5bd98e;
    --accent-strong:#7be6a8;
    --accent-bg:rgba(91,217,142,.12);
    --green:#5bd98e;
    --green-bg:rgba(91,217,142,.13);
    --red:#ff8e96;
    --red-bg:rgba(255,142,150,.12);
    --shadow-soft:0 18px 44px rgba(0,0,0,.28);
  }
}
```

- [ ] **Step 2: Verify CSS syntax by loading the app**

Run: `python -m http.server 5173 --bind 127.0.0.1`

Expected: server starts and serves the project directory. If the port is already in use, keep the existing server.

## Task 2: Polish Mobile Inicio

**Files:**
- Modify: `css/main.css`

- [ ] **Step 1: Add Inicio layout and card polish inside the same mobile block**

Add these selectors inside the `@media (max-width: 767px)` block added in Task 1:

```css
  #mobile-app {
    background:
      radial-gradient(circle at 18% -8%, rgba(22,184,93,.16), transparent 30%),
      linear-gradient(180deg, var(--bg) 0%, var(--bg2) 48%, var(--bg) 100%);
  }

  [data-theme="dark"] #mobile-app {
    background:
      radial-gradient(circle at 18% -8%, rgba(91,217,142,.13), transparent 30%),
      linear-gradient(180deg, #07111d 0%, #0a1422 52%, #07111d 100%);
  }

  .m-topbar {
    background:rgba(255,255,255,.82);
    border-bottom:1px solid rgba(24,45,33,.06);
    box-shadow:0 10px 24px rgba(31,52,39,.06);
    backdrop-filter:blur(18px);
  }

  [data-theme="dark"] .m-topbar {
    background:rgba(7,17,29,.82);
    border-bottom-color:rgba(151,188,229,.08);
    box-shadow:none;
  }

  .m-scroller {
    background:transparent;
    padding:18px 16px calc(env(safe-area-inset-bottom,0px) + 136px);
  }

  .m-home-headline {
    padding:2px 2px 0;
    margin-bottom:16px;
  }

  .m-home-headline strong {
    font-size:26px;
    font-weight:780;
    color:var(--text);
  }

  .m-greeting {
    color:var(--accent-strong);
    letter-spacing:.01em;
  }

  .m-period-switch {
    padding:5px;
    border-radius:18px;
    background:rgba(255,255,255,.86);
    border:1px solid var(--border);
    box-shadow:0 12px 26px rgba(31,52,39,.07);
  }

  [data-theme="dark"] .m-period-switch {
    background:rgba(15,27,44,.86);
    box-shadow:none;
  }

  .m-summary-stack {
    gap:12px;
  }

  .m-summary-card {
    min-height:88px;
    padding:18px 72px 18px 18px;
    border-radius:24px;
    box-shadow:var(--shadow-soft);
  }

  .m-summary-card.income,
  .m-summary-card.balance {
    background:linear-gradient(145deg, rgba(22,184,93,.11), rgba(255,255,255,.96) 58%);
  }

  .m-summary-card.expense {
    background:linear-gradient(145deg, rgba(215,58,68,.105), rgba(255,255,255,.96) 58%);
  }

  [data-theme="dark"] .m-summary-card.income,
  [data-theme="dark"] .m-summary-card.balance {
    background:linear-gradient(145deg, rgba(91,217,142,.13), rgba(15,27,44,.98) 58%);
  }

  [data-theme="dark"] .m-summary-card.expense {
    background:linear-gradient(145deg, rgba(255,142,150,.13), rgba(15,27,44,.98) 58%);
  }

  .m-summary-card span {
    font-size:12px;
    letter-spacing:.01em;
  }

  .m-summary-card strong {
    font-size:25px;
  }

  .m-summary-card i {
    right:18px;
    width:40px;
    height:40px;
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.36);
  }

  .sec-title {
    margin:22px 2px 12px;
    font-size:19px;
  }

  .m-card,
  .expense-heatmap-card,
  .m-stat-mini {
    border-radius:24px;
    border:1px solid var(--border);
    box-shadow:var(--shadow-soft);
  }

  .chart-card,
  .expense-heatmap-card {
    background:rgba(255,255,255,.88);
  }

  [data-theme="dark"] .chart-card,
  [data-theme="dark"] .expense-heatmap-card {
    background:rgba(15,27,44,.9);
  }
```

- [ ] **Step 2: Manually verify Inicio**

Open `http://localhost:5173`, switch to mobile width, and check the `Inicio` tab in both themes.

Expected: summary cards feel cohesive, chart/heatmap cards are softer, and topbar/background do not create heavy visual noise.

## Task 3: Polish Mobile Transacoes Toolbar And Cards

**Files:**
- Modify: `css/main.css`

- [ ] **Step 1: Add Transacoes toolbar and card polish inside the same mobile block**

Add these selectors inside the `@media (max-width: 767px)` block added in Task 1:

```css
  #mp-transactions .sec-title {
    margin-top:8px;
    margin-bottom:14px;
  }

  .tx-controls-wrap {
    margin-bottom:16px;
  }

  .tx-controls {
    gap:10px;
    padding:12px;
    border:1px solid var(--border);
    border-radius:24px;
    background:rgba(255,255,255,.82);
    box-shadow:var(--shadow-soft);
  }

  [data-theme="dark"] .tx-controls {
    background:rgba(15,27,44,.9);
  }

  .tx-topbar {
    margin-bottom:0;
    gap:8px;
  }

  .dash-view-pill,
  .tx-group-toggle {
    min-height:40px;
    border-radius:16px;
    background:var(--card2);
    border-color:var(--border);
    color:var(--text);
  }

  .dash-view-pill.income,
  .tx-type-pill.income {
    color:var(--green);
    background:var(--green-bg);
    border-color:rgba(8,150,74,.18);
  }

  .dash-view-pill.expense,
  .tx-type-pill.expense {
    color:var(--red);
    background:var(--red-bg);
    border-color:rgba(215,58,68,.18);
  }

  .tx-group-toggle.active {
    color:var(--accent-strong);
    background:var(--accent-bg);
    border-color:var(--border2);
  }

  .tx-search-wrap {
    box-shadow:none;
    background:transparent;
  }

  .tx-search-input {
    min-height:44px;
    border-radius:16px;
    background:var(--card2) !important;
    border-color:var(--border);
  }

  .tx-search-input:focus {
    border-color:var(--border2);
    box-shadow:0 0 0 4px var(--accent-bg);
  }

  .tx-flat-list {
    gap:12px;
  }

  .tx-card {
    padding:16px;
    border-radius:24px;
    box-shadow:var(--shadow-soft);
  }

  [data-theme="light"] .tx-card.income {
    background:linear-gradient(145deg, rgba(22,184,93,.085), rgba(255,255,255,.98) 54%);
  }

  [data-theme="light"] .tx-card.expense {
    background:linear-gradient(145deg, rgba(215,58,68,.075), rgba(255,255,255,.98) 54%);
  }

  [data-theme="dark"] .tx-card.income {
    background:linear-gradient(145deg, rgba(91,217,142,.11), rgba(15,27,44,.98) 54%);
  }

  [data-theme="dark"] .tx-card.expense {
    background:linear-gradient(145deg, rgba(255,142,150,.105), rgba(15,27,44,.98) 54%);
  }

  .tx-card-title .tx-name {
    font-size:15px;
    font-weight:720;
  }

  .tx-card-ico {
    width:28px;
    height:28px;
    border-radius:12px;
    background:rgba(255,255,255,.62);
  }

  [data-theme="dark"] .tx-card-ico {
    background:rgba(255,255,255,.06);
  }

  .tx-card-middle,
  .tx-card-date {
    padding-left:37px;
  }

  .tx-cat-badge {
    padding:6px 10px;
    border-radius:999px;
    background:rgba(255,255,255,.7);
  }

  [data-theme="dark"] .tx-cat-badge {
    background:rgba(255,255,255,.06);
  }

  .tx-action-btn {
    width:34px;
    height:34px;
    background:rgba(255,255,255,.52);
  }

  [data-theme="dark"] .tx-action-btn {
    background:rgba(255,255,255,.055);
  }
```

- [ ] **Step 2: Manually verify Transacoes**

Open `http://localhost:5173`, switch to mobile width, and check the `Transacoes` tab in both themes.

Expected: search/filter controls read as one toolbar, cards have clearer hierarchy, and edit/delete buttons remain tappable.

## Task 4: Polish Mobile Navigation And Verification

**Files:**
- Modify: `css/main.css`

- [ ] **Step 1: Add nav/FAB finishing polish inside the same mobile block**

Add these selectors inside the `@media (max-width: 767px)` block added in Task 1:

```css
  .m-bottomnav {
    border-radius:26px;
    background:rgba(255,255,255,.9);
    box-shadow:0 -12px 34px rgba(31,52,39,.12);
    backdrop-filter:blur(18px);
  }

  [data-theme="dark"] .m-bottomnav {
    background:rgba(12,22,36,.92);
    box-shadow:0 -18px 38px rgba(0,0,0,.26);
  }

  .nbtn {
    border-radius:18px;
  }

  .nbtn.on {
    background:var(--accent-bg);
    color:var(--accent-strong);
  }

  .fab {
    border-radius:24px;
    background:linear-gradient(145deg,#2be27b,#06994a);
    box-shadow:0 18px 34px rgba(6,153,74,.32), 0 0 0 8px rgba(255,255,255,.72);
  }

  [data-theme="dark"] .fab {
    box-shadow:0 18px 34px rgba(6,153,74,.24), 0 0 0 8px rgba(7,17,29,.72);
  }
```

- [ ] **Step 2: Run local load check**

Run: `Invoke-WebRequest -UseBasicParsing http://localhost:5173 | Select-Object -ExpandProperty StatusCode`

Expected: `200`

- [ ] **Step 3: Open localhost for user review**

Run: `Start-Process "http://localhost:5173"`

Expected: the default browser opens the app for manual review.

## Self-Review Notes

- Spec coverage: `Inicio`, `Transacoes`, both themes, navigation/FAB, and verification are covered.
- Placeholder scan: no TBD/TODO placeholders remain.
- Scope check: plan avoids data-flow and JavaScript changes, matching the spec.
- Repository note: commits are not included because `D:\estudos\fincontrol-main` is not a Git repository.
