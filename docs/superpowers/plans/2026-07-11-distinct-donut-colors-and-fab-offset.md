# Distinct Donut Colors and FAB Offset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Impedir colisões de cor entre categorias do mesmo donut e subir o FAB mobile em 8 px.

**Architecture:** A seleção de cores será extraída para um módulo puro que recebe nomes, tipo e mapa de cores fixas, devolvendo uma lista estável e sem repetições. O renderer do donut calculará essa lista uma vez e a reutilizará nos segmentos e na legenda; o FAB receberá apenas um override de posição.

**Tech Stack:** JavaScript ES modules, HTML/CSS, Node.js `node:test`, navegador in-app.

---

### Task 1: Criar testes vermelhos para unicidade e posição

**Files:**
- Create: `tests/chart-colors.test.mjs`
- Modify: `tests/mobile-navbar-layout.test.mjs`

- [ ] **Step 1: Write the color tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';

let assignDistinctDonutColors = () => [];
try {
  ({ assignDistinctDonutColors } = await import('../js/ui/chart-colors.mjs'));
} catch {}

test('avoids collision between fixed and fallback donut colors', () => {
  const colors = assignDistinctDonutColors(['Assinaturas', 'Teste'], false, {
    Assinaturas: '#29D6FF',
  });
  assert.equal(new Set(colors.map((color) => color.toLowerCase())).size, 2);
});

test('resolves duplicated fixed colors and stays deterministic', () => {
  const fixed = { A: '#29D6FF', B: '#29D6FF' };
  const first = assignDistinctDonutColors(['A', 'B', 'C'], false, fixed);
  const second = assignDistinctDonutColors(['A', 'B', 'C'], false, fixed);
  assert.equal(new Set(first.map((color) => color.toLowerCase())).size, 3);
  assert.deepEqual(first, second);
});

test('keeps every color unique after the base palette is exhausted', () => {
  const categories = Array.from({ length: 30 }, (_, index) => `Categoria ${index}`);
  const colors = assignDistinctDonutColors(categories, false, {});
  assert.equal(new Set(colors.map((color) => color.toLowerCase())).size, categories.length);
});
```

- [ ] **Step 2: Add the FAB offset contract**

Append to `tests/mobile-navbar-layout.test.mjs`:

```js
test('centered mobile FAB is raised eight pixels', () => {
  assert.match(css, /\.fab-wrap\s*\{[^}]*bottom:calc\(env\(safe-area-inset-bottom,0px\) \+ 30px\)/s);
});
```

- [ ] **Step 3: Verify RED**

Run: `node --test tests/chart-colors.test.mjs tests/mobile-navbar-layout.test.mjs`

Expected: color tests fail because the module does not exist; FAB test fails because the current offset is 22 px.

### Task 2: Implementar a atribuição sem colisões

**Files:**
- Create: `js/ui/chart-colors.mjs`
- Modify: `js/ui/charts.js:1-25,250-310`
- Test: `tests/chart-colors.test.mjs`

- [ ] **Step 1: Create the pure color module**

```js
export const INCOME_PALETTE = [
  '#29D6FF', '#12384D', '#6DDFF6', '#7A8B96',
  '#A7DDE9', '#081522', '#AAB7C0', '#4BA9C4',
];

export const EXPENSE_PALETTE = [
  '#12384D', '#29D6FF', '#7A8B96', '#A7DDE9',
  '#081522', '#4BA9C4', '#AAB7C0', '#6DDFF6',
  '#5A6B76', '#D7E6EC', '#1C526C', '#8EC7D6',
];

const COMPLEMENTARY_PALETTE = [
  '#22C55E', '#F97316', '#A78BFA', '#F472B6',
  '#FBBF24', '#FB7185', '#F59E0B', '#94A3B8',
  '#4ADE80', '#06D6A0', '#818CF8', '#9CA3AF',
];

const key = (color) => String(color).toLowerCase();

export function assignDistinctDonutColors(categories, isIncome = false, fixedColors = {}) {
  const palette = isIncome ? INCOME_PALETTE : EXPENSE_PALETTE;
  const candidates = [...palette, ...COMPLEMENTARY_PALETTE];
  const used = new Set();

  return categories.map((category, index) => {
    const preferred = fixedColors[category] || palette[index % palette.length];
    let color = [preferred, ...candidates].find((candidate) => !used.has(key(candidate)));

    if (!color) {
      let hue = Math.round((index * 137.508) % 360);
      color = `hsl(${hue} 72% 52%)`;
      while (used.has(key(color))) {
        hue = (hue + 17) % 360;
        color = `hsl(${hue} 72% 52%)`;
      }
    }

    used.add(key(color));
    return color;
  });
}
```

- [ ] **Step 2: Integrate once per donut**

In `js/ui/charts.js`, import `assignDistinctDonutColors`, remove the local palette constants and replace repeated `getDonutColor` calls with:

```js
const donutColors = assignDistinctDonutColors(
  sortedCategories.map(([category]) => category),
  isIncome,
  CATEGORY_COLORS,
);
```

Use `donutColors[i]` in both `chartStops` and the category rows, then remove `getDonutColor`.

- [ ] **Step 3: Verify color tests GREEN**

Run: `node --test tests/chart-colors.test.mjs`

Expected: three tests pass.

### Task 3: Subir o FAB e validar tudo

**Files:**
- Modify: `css/main.css` final navbar override
- Test: `tests/mobile-navbar-layout.test.mjs`

- [ ] **Step 1: Raise the FAB**

Replace only the final offset:

```css
bottom:calc(env(safe-area-inset-bottom,0px) + 30px);
```

- [ ] **Step 2: Run focused and full tests**

Run: `node --test tests/chart-colors.test.mjs tests/mobile-navbar-layout.test.mjs && npm test`

Expected: all focused and project tests pass.

- [ ] **Step 3: Validate the real mobile preview**

Reload `http://localhost:4174/real-mobile-shell.html` and inspect the embedded real site.

Expected: every `.cat-ico` background is unique; the donut gradient uses the same colors; FAB center X remains 187.5 px and center Y is 8 px above the previous measurement.

- [ ] **Step 4: Final verification**

Run: `npm test && git diff --check`

Expected: zero failures and no whitespace errors.
