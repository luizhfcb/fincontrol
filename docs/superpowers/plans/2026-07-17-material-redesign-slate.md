# Material Redesign (grafite + azul) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repaginar o mobile para linguagem Material Design 3 estilo Nubank: dark grafite (não navy), acento azul único, superfícies planas, bottom nav com indicador, FAB squircle, ripple, e limpeza das camadas mortas de CSS.

**Architecture:** Tokens redefinidos na raiz dos temas (`[data-theme]`), um bloco mobile consolidado substitui as camadas de override; utilitário JS de ripple e helper único de empty state; HTML muda pouco (classes utilitárias, sem reestruturação de páginas).

**Tech Stack:** HTML, CSS, JavaScript ES modules, Node.js `node:test`, preview real em `http://localhost:4174/real-mobile-shell.html`.

**Baseline:** Commitar a camada teal + empty states pendente no working tree ANTES da Task 1.

---

## Estrutura de arquivos

- Criar `tests/material-redesign.test.mjs`: contratos de tokens, superfícies planas, nav/FAB e limpeza.
- Criar `js/ui/ripple.js`: state layer de toque.
- Criar `js/ui/empty-state.js`: helper único de empty state guiado.
- Modificar `css/main.css`: tokens novos + bloco consolidado + remoção de camadas mortas.
- Modificar `index.html`: indicador da nav, FAB, classes de lista do hub Mais.
- Modificar `js/ui/charts.js`, `js/ui/tx-list.js`, `js/ui/analytics.js`: usar o helper de empty state.

### Task 1: Contratos vermelhos

**Files:**
- Create: `tests/material-redesign.test.mjs`

- [ ] **Step 1: Write the failing contracts**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../css/main.css', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('dark theme uses graphite surfaces, not navy', () => {
  assert.match(css, /--bg:#0F1114/i);
  assert.match(css, /--card:#1A1E25/i);
  assert.doesNotMatch(css, /--bg:#07111d/i);
});

test('single blue brand accent replaces teal', () => {
  assert.match(css, /--brand:#5B9DFF/i);
  assert.match(css, /--brand:#2563EB/i);
  assert.doesNotMatch(css, /#00D1C8/i);
  assert.doesNotMatch(css, /--teal/);
});

test('hero and cards are flat (no gradients or glows on mobile surfaces)', () => {
  const heroBlock = css.match(/\.m-executive-card\{[^}]*\}/gs)?.join('') ?? '';
  assert.doesNotMatch(heroBlock, /linear-gradient|radial-gradient/);
  assert.doesNotMatch(css, /--surface-card:linear-gradient/);
});

test('material bottom nav indicator and squircle FAB exist', () => {
  assert.match(css, /\.nbtn\.on .ni\{[^}]*background:var\(--brand-soft\)/s);
  assert.match(css, /#fabBtn\{[^}]*border-radius:16px/s);
});

test('ripple utility is wired', () => {
  assert.match(html, /js\/ui\/ripple\.js|initRipple/);
});

test('dead legacy layers are gone', () => {
  assert.doesNotMatch(css, /\.m-summary-card/);
  assert.doesNotMatch(css, /\.m-home-headline/);
  assert.doesNotMatch(css, /Hero em card gradiente/);
});

test('empty states render through the shared helper', async () => {
  const charts = await readFile(new URL('../js/ui/charts.js', import.meta.url), 'utf8');
  const txList = await readFile(new URL('../js/ui/tx-list.js', import.meta.url), 'utf8');
  assert.match(charts, /renderEmptyState\(/);
  assert.match(txList, /renderEmptyState\(/);
});
```

- [ ] **Step 2: Verify RED** — `node --test tests/material-redesign.test.mjs`

### Task 2: Tokens de tema (grafite + azul)

**Files:**
- Modify: `css/main.css` (blocos `[data-theme="dark"]` e `[data-theme="light"]` na raiz + bloco `#mobile-app`)

- [ ] **Step 1:** Substituir a paleta dark navy pela grafite da spec (`--bg:#0F1114`, `--card:#1A1E25`, etc.) e a light pela neutra (`--bg:#F6F7F9`, `--brand:#2563EB`).
- [ ] **Step 2:** Retargetar `--brand/--brand-strong/--brand-soft/--brand-ring` para azul nos dois temas; apagar `--teal*` e `--analytics-blue*` (usar `--brand`).
- [ ] **Step 3:** Atualizar `--fin-green/--fin-red` (dark `#4ADE80/#F87171`, light `#0A8F4E/#DC2626`) e `THEME_COLORS` em `js/services/theme.js` + `meta theme-color` (`#0F1114`).
- [ ] **Step 4:** Tokens novos: `--r-card:16px`, `--r-sheet:28px`, `--elev-1`/`--elev-2` (sombras discretas), `--ease-emphasized`, `--ease-standard`, `--dur-1:150ms`, `--dur-2:250ms`.
- [ ] **Step 5:** `node --test tests/material-redesign.test.mjs` — contratos de token verdes.

### Task 3: Superfícies planas

**Files:**
- Modify: `css/main.css`

- [ ] **Step 1: Hero plano.** Remover gradiente/radial/glow do `.m-executive-card`; card sólido `--card`, hairline, label `--brand`, saldo `--text`. Pills receita/despesa: fundo tonal 12% de `--fin-green/red` nos DOIS temas (mata o bug das pills sem cor no light).
- [ ] **Step 2: Cards.** `--surface-card` vira cor sólida (`--card`); sombra `--elev-1`; raio `--r-card`. Vale para report-card, recentes, análises, stats, limites.
- [ ] **Step 3: Barras e chips.** Barras de análises sólidas `--brand` (pico `--brand-strong`), sem gradiente/glow; chips e segmented sobre `--card2`; remover marcadores laterais `::before` dos títulos.
- [ ] **Step 4: FAB.** `border-radius:16px`, fundo `--brand`, ícone `#fff`, sombra `--elev-2`, `border:0` (mata o anel duplo do light). Ações do menu radial com mesmos raios.
- [ ] **Step 5:** Testes de superfície verdes + visual check rápido no preview.

### Task 4: Componentes Material (nav, ripple, empty/skeleton)

**Files:**
- Modify: `index.html`, `css/main.css`
- Create: `js/ui/ripple.js`, `js/ui/empty-state.js`
- Modify: `js/main.js`, `js/ui/charts.js`, `js/ui/tx-list.js`, `js/ui/analytics.js`

- [ ] **Step 1: Nav com indicador.** `.nbtn.on .ni` ganha pílula `--brand-soft` (`padding:4px 14px;border-radius:999px`); botão sem fundo próprio; transição `--dur-2 --ease-emphasized`.
- [ ] **Step 2: Ripple.** `js/ui/ripple.js`: delegação em `#mobile-app` para `.nbtn, .m-pill, .recent-tx-item, .more-hub-card, .analytics-period-filter button, .tx-keypad-grid button` — span radial com `--brand` a 12%, 450ms, removido em `animationend`; respeitar `prefers-reduced-motion`. Registrar em `js/main.js`.
- [ ] **Step 3: Empty state único.** `js/ui/empty-state.js` exporta `renderEmptyState({icon,title,hint,ctaLabel,ctaAction})` retornando o markup `.empty-guided`. Usar em `charts.js:251`, `tx-list.js:211/385`, `analytics.js:217` e substituir os 3 blocos duplicados no `index.html`/`tx-list.js`.
- [ ] **Step 4: Skeleton na home.** `mBarChart` e `mRecentTx` iniciam com `chart-skeleton`; empty-guided só vem do render.
- [ ] **Step 5:** `node --test tests/material-redesign.test.mjs && npm test`.

### Task 5: Limpeza das camadas mortas

**Files:**
- Modify: `css/main.css`

- [ ] **Step 1:** Remover blocos mortos (referências pela âncora de comentário, conferir linha na hora): executive antigo (~172–348), redesign verde light (~1990–2715), hero azul royal (~7246–7397 parte hero), polish navy (~7663–7770), camada teal (~7772–7844), seletores sem HTML (`.m-summary-card`, `.m-home-headline`, `.m-inout-row`, `.m-inout`, `.mobile-floating-cta`).
- [ ] **Step 2:** Consolidar o que sobrou do mobile num bloco único tokenizado no fim do arquivo; remover `!important` que perdeu razão de existir (testar um por um no preview).
- [ ] **Step 3:** Meta: `wc -l css/main.css` ≤ 6000. Contratos de limpeza verdes.
- [ ] **Step 4:** `npm test` + smoke visual completo (todas as abas, dois temas).

### Task 6: Validação no site real

- [ ] **Step 1:** `http://localhost:4174/real-mobile-shell.html` (375×812): Home, Transações, Análises, Mais, módulos do hub — dois temas.
- [ ] **Step 2:** Conferir: nenhum gradiente/glow residual; indicador da nav anima; ripple nos toques; FAB squircle azul; empty states guiados após troca para mês vazio; skeleton no load.
- [ ] **Step 3:** Contraste AA dos pares texto/fundo novos (saldo, labels, chips) — checar com devtools.
- [ ] **Step 4:** 320px e 430px sem overflow horizontal; `prefers-reduced-motion` desliga ripple/donut.
- [ ] **Step 5:** `npm test && git diff --check`.
