# Mobile Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the mobile UI to feel cleaner, softer, and closer to the provided ZapGastos-style reference.

**Architecture:** Keep the current vanilla HTML/CSS/JS structure and avoid changing data flow. Add small mobile-specific markup for summary cards and use CSS media-query overrides at the end of `css/main.css` so desktop risk stays low.

**Tech Stack:** Vanilla HTML, CSS, JavaScript modules, existing Firebase app.

---

## File Structure

- Modify `index.html`: add mobile summary card markup inside the existing mobile home hero and adjust bottom navigation order/labels.
- Modify `css/main.css`: append a mobile-first visual refresh block at the end of the file.
- No new runtime files are required.

### Task 1: Mobile Summary Markup

**Files:**
- Modify: `index.html:104-117`

- [ ] **Step 1: Add summary cards inside `.m-balance-hero`**

Replace the existing mobile balance hero contents with this structure, keeping the same IDs so `refreshUI()` continues to update values:

```html
<div class="m-balance-hero">
  <div class="m-home-headline">
    <div>
      <span class="m-greeting">Bom dia</span>
      <strong>Resumo do mês</strong>
    </div>
    <div id="mDashViewWrap" class="dash-view-wrap"></div>
  </div>
  <div class="m-period-switch">
    <button class="mnbtn" onclick="changeMonth(-1)">‹</button>
    <span id="monthLabel">—</span>
    <button class="mnbtn" onclick="changeMonth(1)">›</button>
  </div>
  <label id="mBalanceLabel">SALDO TOTAL</label>
  <div class="m-balance-row">
    <div class="big-val positive" id="mBalance">R$ 0,00</div>
    <span class="m-badge" id="mBalanceDelta">+0%</span>
  </div>
  <p id="mPeriodLabel">—</p>
  <div class="m-summary-stack" aria-label="Resumo financeiro do mês">
    <article class="m-summary-card income">
      <span>Total Receitas</span>
      <strong id="mIncome">R$ 0,00</strong>
      <i aria-hidden="true">↗</i>
    </article>
    <article class="m-summary-card expense">
      <span>Total Despesas</span>
      <strong id="mExpense">R$ 0,00</strong>
      <i aria-hidden="true">↘</i>
    </article>
    <article class="m-summary-card balance">
      <span>Saldo do Mês</span>
      <strong id="mBalanceCard">R$ 0,00</strong>
      <i aria-hidden="true">$</i>
    </article>
  </div>
</div>
```

- [ ] **Step 2: Update `refreshUI()` to write the duplicate balance card value**

In `js/ui/render.js`, after the loop that updates `mBalance` and `dBalance`, add:

```js
  setText('mBalanceCard', formatCurrency(heroValue));
```

Expected: both the original hero balance and the new summary balance card stay in sync.

### Task 2: Mobile Bottom Navigation and FAB

**Files:**
- Modify: `index.html:169-175`
- Modify: `css/main.css` append block

- [ ] **Step 1: Reorder mobile nav labels**

Use `Início`, `Contas`, `Transações`, `Limites`, and `Mais` as the visible mobile tabs while preserving existing `onclick` targets.

- [ ] **Step 2: Center the FAB visually on mobile**

Append CSS that positions `.fab-wrap` at the bottom center on mobile, makes `.fab` green, and keeps the menu opening upward.

### Task 3: Mobile Visual Refresh CSS

**Files:**
- Modify: `css/main.css` append block at end of file

- [ ] **Step 1: Append mobile-only CSS overrides**

Add a final `@media (max-width: 767px)` block that:

- Makes the light mobile background warm and clean.
- Styles `.m-topbar` like an app header.
- Converts `.m-balance-hero` and `.m-summary-card` into soft white cards.
- Refines `.tx-card` spacing, shadow, value color, icon size, and action buttons.
- Makes `.m-bottomnav` white, rounded, and native-app-like.
- Keeps dark theme usable with alternate dark surfaces.

- [ ] **Step 2: Verify syntax**

Run: `node --check js/ui/render.js`

Expected: no syntax errors.

- [ ] **Step 3: Manual browser verification**

Open `http://localhost:5173` at mobile width and verify:

- The home page shows summary cards for receitas, despesas, and saldo.
- Bottom navigation still switches pages.
- The centered green `+` opens the existing add menu.
- Transaction edit/delete buttons remain clickable.
- Desktop width remains structurally unchanged.

## Self-Review

- Spec coverage: tasks cover mobile-first refresh, summary cards, bottom nav/FAB, transaction cards, and desktop preservation.
- Placeholder scan: no placeholders remain.
- Type consistency: existing IDs `mIncome`, `mExpense`, `mBalance`, `mBalanceLabel`, `mBalanceDelta`, and `monthLabel` remain available to current render code.
