# Lean Home, Analytics Tab and Animated Donut Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Home mobile enxuta (hero mínimo + donut compacto sempre visível + transações recentes), nova aba `mp-analytics` concentrando todos os relatórios, navbar `Início · Transações · FAB · Análises · Mais` (Contas no hub), e donut SVG com animação de desenho sequencial + count-up.

**Architecture:** Os containers de relatório mantêm seus ids ao migrar da home para `mp-analytics`, então `render.js` segue orquestrando sem mudança de dados. Um novo módulo `js/ui/analytics.js` renderiza o que é exclusivo da aba (header de período, filtro, gasto diário, breakdown). O donut troca `conic-gradient` por SVG em `charts.js`.

**Tech Stack:** HTML, CSS responsivo, JavaScript ES modules, SVG, Node.js `node:test`, navegador in-app.

**Spec:** `docs/superpowers/specs/2026-07-15-lean-home-analytics-tab-animated-donut-design.md`

---

## Estrutura de arquivos

- Create: `tests/mobile-lean-home-layout.test.mjs`
- Create: `tests/mobile-analytics-layout.test.mjs`
- Create: `tests/animated-donut.test.mjs`
- Create: `js/ui/analytics.js`
- Modify: `index.html` (hero, seção recentes, `mp-analytics`, navbar, hub Mais)
- Modify: `js/ui/navigation.js` (`morePages` ganha `bills`)
- Modify: `js/ui/render.js` (chama analytics + recentes)
- Modify: `js/ui/tx-list.js` (export de linha reutilizável / lista recente)
- Modify: `js/ui/charts.js` (donut SVG animado)
- Modify: `js/core/state.js` (`analyticsPeriod`)
- Modify: `css/main.css` (pills, donut compacto, analytics, animações)

### Task 0: Sanear working tree

- [ ] **Step 1: Confirmar com o usuário e descartar a regressão não commitada**

O diff atual de `index.html` reverte `d4e99d8` e contém `</div>/voce`. Descartar:

```bash
git checkout -- index.html
```

Requer confirmação explícita do usuário antes de executar (ação destrutiva).

- [ ] **Step 2: Verificar baseline**

Run: `git status && npm test`

Expected: working tree limpo, suíte verde.

---

## Fase 1 — Home enxuta

### Task 1: Contratos vermelhos da home

**Files:**
- Create: `tests/mobile-lean-home-layout.test.mjs`

- [ ] **Step 1: Write the failing contracts**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const home = html.match(/<div class="m-page active" id="mp-home">([\s\S]*?)<div class="m-page" id="mp-/)?.[1] ?? '';

test('hero keeps only balance plus inline income/expense pills', () => {
  assert.match(home, /class="m-inout-pills"/);
  assert.doesNotMatch(home, /class="m-flow-card"/);
  assert.doesNotMatch(home, /id="mBalanceDelta"/);
  assert.doesNotMatch(home, /id="mBalanceComparison"/);
});

test('category donut is always visible on home', () => {
  assert.match(home, /id="mBarChart"/);
  assert.doesNotMatch(home, /id="mChartHeader"/);
  assert.doesNotMatch(home, /collapse-shell/);
});

test('home shows recent transactions and no reports', () => {
  assert.match(home, /id="mRecentTx"/);
  assert.match(home, /onclick="goMPage\('transactions'\)"/);
  for (const id of ['mExpenseHeatmap', 'mWeekdayChart', 'mSixMonthChart', 'mLimitsMini', 'mDays']) {
    assert.doesNotMatch(home, new RegExp(`id="${id}"`));
  }
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/mobile-lean-home-layout.test.mjs`

### Task 2: HTML do hero e da home

**Files:**
- Modify: `index.html` (bloco `mp-home`)
- Modify: `css/main.css`

- [ ] **Step 1: Substituir `m-inout-row` + `m-flow-card` pelas pills**

```html
<div class="m-inout-pills" aria-label="Receitas e despesas do mês">
  <button class="m-pill income" onclick="setDashView('income')" aria-label="Ver receitas do mês">
    <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
    <strong id="mIncome" class="priv">R$ 0,00</strong>
  </button>
  <button class="m-pill expense" onclick="setDashView('expense')" aria-label="Ver despesas do mês">
    <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
    <strong id="mExpense" class="priv">R$ 0,00</strong>
  </button>
</div>
```

Remover do hero: `m-hero-meta` (badge + comparação) e `m-flow-card` (renascem em Análises na Task 6).

- [ ] **Step 2: Donut sem collapse**

Trocar o card colapsável por:

```html
<div class="m-card report-card">
  <div class="report-head"><span>Gastos por Categoria</span></div>
  <div id="mBarChart"><div class="empty">Sem gastos neste mês</div></div>
</div>
```

Remover o ramo `chart` de `toggleReportBlock` em `render.js`.

- [ ] **Step 3: Seção de transações recentes**

```html
<div class="sec-title">Transações recentes <button class="sec-link" onclick="goMPage('transactions')">Ver todas</button></div>
<div class="m-card grouped-list" id="mRecentTx"><div class="empty">Nenhum lançamento neste mês</div></div>
```

- [ ] **Step 4: Remover da home** heatmap, weekday, sixmonth, mini stats e limites (serão realocados na Task 6 — manter os blocos em um stash temporário no próprio diff).

- [ ] **Step 5: CSS das pills** (uma linha, ≥44 px de toque, verde/vermelho, tema claro/escuro).

- [ ] **Step 6: Verify**

Run: `node --test tests/mobile-lean-home-layout.test.mjs`

Expected: verde. Suíte completa ainda pode falhar (containers movidos só voltam na Task 6) — rodar suíte completa apenas ao fim da Fase 2.

### Task 3: Render das transações recentes

**Files:**
- Modify: `js/ui/tx-list.js` (exportar `renderRecentTransactions(containerId, transactions, limit = 5)` reutilizando o markup de linha existente)
- Modify: `js/ui/render.js` (chamar em `refreshUI`)

- [ ] **Step 1: Implementar e ligar no `refreshUI`**
- [ ] **Step 2: Verificar lista com 0, 1 e >5 transações**

### Task 4: Donut compacto (layout)

**Files:**
- Modify: `js/ui/charts.js` (`buildDonutMarkup`)
- Modify: `css/main.css`

- [ ] **Step 1: Novo layout** — donut à esquerda (total + nº de categorias no centro), legenda à direita com ponto de cor + nome + percentual (sem valores; detalhe fica em Análises). Máximo ~6 linhas; excedente agrupado em "Outros".
- [ ] **Step 2: Validar tema claro/escuro e visão Receitas/Despesas.**

---

## Fase 2 — Aba Análises

### Task 5: Contratos vermelhos da navegação e da aba

**Files:**
- Create: `tests/mobile-analytics-layout.test.mjs`

- [ ] **Step 1: Write the failing contracts**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const navigation = await readFile(new URL('../js/ui/navigation.js', import.meta.url), 'utf8');

test('navbar orders Início, Transações, Análises, Mais around the FAB', () => {
  const nav = html.match(/<nav class="m-bottomnav">([\s\S]*?)<\/nav>/)?.[1] ?? '';
  assert.deepEqual([...nav.matchAll(/id="mn-([^"]+)"/g)].map((m) => m[1]), [
    'home', 'transactions', 'analytics', 'more',
  ]);
});

test('analytics page hosts the relocated report containers', () => {
  const page = html.match(/<div class="m-page" id="mp-analytics">([\s\S]*?)<div class="m-page" id="mp-/)?.[1] ?? '';
  for (const id of ['maPeriodFilter', 'maDailyChart', 'maBreakdown', 'mExpenseHeatmap',
    'mWeekdayChart', 'mSixMonthChart', 'mLimitsMini', 'mBalanceDelta', 'mFlowIncome']) {
    assert.match(page, new RegExp(`id="${id}"`));
  }
});

test('bills lives in the More hub and keeps More active', () => {
  assert.match(html, /class="more-hub-card" onclick="goMPage\('bills'\)"/);
  assert.match(navigation, /morePages = new Set\(\['limits', 'stock', 'subscriptions', 'bills'\]\)/);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/mobile-analytics-layout.test.mjs`

### Task 6: HTML da aba, navbar e hub

**Files:**
- Modify: `index.html`
- Modify: `js/ui/navigation.js`
- Modify: `css/main.css`

- [ ] **Step 1: Criar `mp-analytics`** com, nesta ordem: header de período (total gasto + `mBalanceDelta` + `mBalanceComparison` + barra de fluxo `mFlowIncome`/`mFlowExpense`/`mFlowCaption`), filtro `maPeriodFilter` (Semana · Mês · Ano, `role="radiogroup"`), `maDailyChart`, `maBreakdown`, e os blocos movidos da home com ids intactos: `mExpenseHeatmap`, `mWeekdayChart`, `mSixMonthChart`, mini stats (`mDays`/`mAvg`/`mCount`/`mBig`), `mLimitsMini`.
- [ ] **Step 2: Navbar** — trocar `mn-bills` por `mn-analytics` (`goMPage('analytics')`, ícone de barras); adicionar card Contas ao hub `mp-more`.
- [ ] **Step 3: `navigation.js`** — `morePages` = `['limits', 'stock', 'subscriptions', 'bills']`.
- [ ] **Step 4: Verify**

Run: `node --test tests/mobile-analytics-layout.test.mjs tests/mobile-lean-home-layout.test.mjs`

### Task 7: Módulo `analytics.js`

**Files:**
- Create: `js/ui/analytics.js`
- Modify: `js/core/state.js` (`analyticsPeriod: 'month'`)
- Modify: `js/ui/render.js` (delegar)

- [ ] **Step 1: `renderAnalytics(allTransactions)`** — calcula janela do período (`week` = semana corrente, `month` = mês corrente via `getMonthlyTransactions`, `year` = ano corrente) e período anterior equivalente; renderiza header (total gasto, delta via `buildDashboardComparison`, fluxo), `maDailyChart` (barras por dia — reutilizar padrão `.fin-bar` + `selectChartBar`) e `maBreakdown` (ícone + nome + valor + % + barra de progresso, cores de `assignDistinctDonutColors`).
- [ ] **Step 2: `setAnalyticsPeriod(period)`** exposto no `window` (padrão dos handlers atuais), re-renderiza só a aba.
- [ ] **Step 3: `refreshUI` chama `renderAnalytics`;** heatmap/weekday/sixmonth/stats seguem mensais e intocados.
- [ ] **Step 4: Verify GREEN + full suite**

Run: `npm test`

- [ ] **Step 5: Commit da Fase 1+2** (mensagem sugerida: `feat: home enxuta, aba analises e contas no hub mais`).

---

## Fase 3 — Donut animado

### Task 8: Contratos do donut SVG

**Files:**
- Create: `tests/animated-donut.test.mjs`

- [ ] **Step 1: Write the failing contracts**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const charts = await readFile(new URL('../js/ui/charts.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../css/main.css', import.meta.url), 'utf8');

test('donut renders as SVG arcs, not conic-gradient', () => {
  assert.doesNotMatch(charts, /conic-gradient/);
  assert.match(charts, /stroke-dasharray/);
  assert.match(charts, /donut-svg/);
});

test('animation is staggered and respects reduced motion', () => {
  assert.match(charts, /animation-delay/);
  assert.match(css, /prefers-reduced-motion/);
});
```

- [ ] **Step 2: Verify RED**

### Task 9: Implementar donut SVG

**Files:**
- Modify: `js/ui/charts.js`
- Modify: `css/main.css`

- [ ] **Step 1: Gerar arcos** — `<circle>` por fatia com `stroke-dasharray = fração·circunferência` e rotação acumulada; `stroke-dashoffset` animado de `comprimento → 0` via keyframe, `animation-delay` escalonado (~90 ms por fatia).
- [ ] **Step 2: Count-up** do total no centro com `requestAnimationFrame` (~700 ms), pulando quando `matchMedia('(prefers-reduced-motion: reduce)')`.
- [ ] **Step 3: Interação** — toque/Enter na fatia aumenta `stroke-width` e mostra categoria + valor (padrão `fin-bar-readout`); `tabindex="0"` + `aria-label` por fatia.
- [ ] **Step 4: Reduced motion** — sem sweep nem count-up; render final direto.
- [ ] **Step 5: Verify GREEN + full suite**

Run: `node --test tests/animated-donut.test.mjs && npm test`

- [ ] **Step 6: Commit da Fase 3** (sugestão: `feat: donut svg com animacao sequencial e count-up`).

---

## Task 10: Validação no site real

- [ ] **Step 1:** Preview mobile 375 × 812, temas claro e escuro.
- [ ] **Step 2:** Home: hero (saldo + pills), donut visível com animação, 5 recentes, "Ver todas" navega.
- [ ] **Step 3:** Análises: filtro Semana/Mês/Ano recalcula header, gasto diário e breakdown; heatmap e demais gráficos renderizam; troca de mês atualiza tudo.
- [ ] **Step 4:** Navbar/hub: estados ativos corretos (Contas/Categorias/Assinaturas/Estoque destacam Mais); sem overflow horizontal 320–430 px.
- [ ] **Step 5:** Donut: animação sequencial, count-up, tap destaca fatia; com `prefers-reduced-motion` render estático.
- [ ] **Step 6:** `npm test && git diff --check`.
