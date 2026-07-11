# Mobile Navbar and More Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Equalizar os cards de Receitas/Despesas e reorganizar a navbar mobile como `Início · Transações · FAB · Contas · Mais`, com Categorias e Estoque dentro de um hub Mais.

**Architecture:** O HTML existente continuará contendo páginas mobile independentes; uma nova página estática `mp-more` funcionará como hub. `goMobilePage` mapeará rotas secundárias para o estado ativo de Mais, enquanto overrides CSS finais garantirão colunas iguais e posicionamento central do FAB.

**Tech Stack:** HTML, CSS responsivo, JavaScript ES modules, Node.js `node:test`, navegador in-app.

---

## Estrutura de arquivos

- Criar `tests/mobile-navbar-layout.test.mjs`: contratos da ordem, hub, estado ativo e geometria CSS.
- Modificar `index.html`: adicionar `mp-more` e reorganizar os quatro botões da navbar.
- Modificar `js/ui/navigation.js`: manter Mais ativo nas páginas secundárias.
- Modificar `css/main.css`: colunas iguais, hub Mais, grid da navbar e FAB centralizado.

### Task 1: Registrar os requisitos como testes vermelhos

**Files:**
- Create: `tests/mobile-navbar-layout.test.mjs`
- Read: `index.html`
- Read: `js/ui/navigation.js`
- Read: `css/main.css`

- [ ] **Step 1: Write the failing contracts**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../css/main.css', import.meta.url), 'utf8');
const navigation = await readFile(new URL('../js/ui/navigation.js', import.meta.url), 'utf8');

test('mobile navbar orders primary destinations around the centered FAB', () => {
  const nav = html.match(/<nav class="m-bottomnav">([\s\S]*?)<\/nav>/)?.[1] ?? '';
  assert.deepEqual([...nav.matchAll(/id="mn-([^"]+)"/g)].map((match) => match[1]), [
    'home', 'transactions', 'bills', 'more',
  ]);
  assert.doesNotMatch(nav, /id="mn-limits"/);
  assert.doesNotMatch(nav, /id="mn-stock"/);
});

test('More hub links to Categories and Stock', () => {
  assert.match(html, /id="mp-more"/);
  assert.match(html, /class="more-hub-card" onclick="goMPage\('limits'\)"/);
  assert.match(html, /class="more-hub-card" onclick="goMPage\('stock'\)"/);
});

test('secondary mobile pages keep More selected', () => {
  assert.match(navigation, /const morePages = new Set\(\['limits', 'stock', 'subscriptions'\]\)/);
  assert.match(navigation, /const navName = morePages\.has\(name\) \? 'more' : name/);
  assert.match(navigation, /`mn-\$\{navName\}`/);
});

test('light summary cards and navbar use symmetric mobile geometry', () => {
  assert.match(css, /\.m-inout-row\s*\{[^}]*repeat\(2,minmax\(0,1fr\)\)/s);
  assert.match(css, /\.m-inout\s*\{[^}]*min-width:0[^}]*width:100%/s);
  assert.match(css, /#mn-home\s*\{\s*grid-column:1/);
  assert.match(css, /#mn-transactions\s*\{\s*grid-column:2/);
  assert.match(css, /#mn-bills\s*\{\s*grid-column:4/);
  assert.match(css, /#mn-more\s*\{\s*grid-column:5/);
  assert.match(css, /\.fab-wrap\s*\{[^}]*left:50%[^}]*right:auto[^}]*translateX\(-50%\)/s);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/mobile-navbar-layout.test.mjs`

Expected: four failures because the old navbar, hub, mapping and geometry still exist.

### Task 2: Implementar HTML e estado ativo da navegação

**Files:**
- Modify: `index.html:205-225`
- Modify: `js/ui/navigation.js:17-28`
- Test: `tests/mobile-navbar-layout.test.mjs`

- [ ] **Step 1: Add the More hub before the existing Stock page**

```html
<div class="m-page" id="mp-more">
  <div style="height:10px"></div>
  <div class="sec-title">Mais</div>
  <div class="more-hub-grid" aria-label="Mais opções">
    <button class="more-hub-card" onclick="goMPage('limits')">
      <span class="more-hub-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l6 9H6z"/><circle cx="6" cy="18" r="3"/><rect x="15" y="15" width="6" height="6" rx="1"/></svg></span>
      <span><strong>Categorias</strong><small>Limites e organização dos gastos</small></span>
    </button>
    <button class="more-hub-card" onclick="goMPage('stock')">
      <span class="more-hub-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5"/><path d="M12 12L4 7.5"/><path d="M12 21v-9"/></svg></span>
      <span><strong>Estoque</strong><small>Itens, alertas e reposições</small></span>
    </button>
  </div>
</div>
```

- [ ] **Step 2: Replace the primary navbar order**

Keep the existing button markup and SVGs, but leave exactly these ids and handlers in order:

```html
<nav class="m-bottomnav">
  <button class="nbtn on" id="mn-home" onclick="goMPage('home')"><span class="ni"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9l8-6 8 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6"/></svg></span>Início</button>
  <button class="nbtn" id="mn-transactions" onclick="goMPage('transactions')"><span class="ni"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h18"/><path d="M3 6h18"/><path d="M3 18h12"/></svg></span>Transações</button>
  <button class="nbtn" id="mn-bills" onclick="goMPage('bills')"><span class="ni"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M6 3h12"/><path d="M10 13h4"/></svg></span>Contas</button>
  <button class="nbtn" id="mn-more" onclick="goMPage('more')"><span class="ni"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></span>Mais</button>
</nav>
```

- [ ] **Step 3: Map secondary pages to the More tab**

Inside `goMobilePage`, replace the direct nav id lookup with:

```js
const morePages = new Set(['limits', 'stock', 'subscriptions']);
const navName = morePages.has(name) ? 'more' : name;
document.getElementById(`mn-${navName}`)?.classList.add('on');
```

- [ ] **Step 4: Run the focused test**

Run: `node --test tests/mobile-navbar-layout.test.mjs`

Expected: HTML and navigation tests pass; CSS geometry test still fails.

### Task 3: Corrigir a geometria CSS

**Files:**
- Modify: `css/main.css` final mobile override block
- Test: `tests/mobile-navbar-layout.test.mjs`

- [ ] **Step 1: Equalize the summary cards**

```css
.m-inout-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:12px}
.m-inout{
  min-width:0;
  width:100%;
  display:flex;
  align-items:center;
  gap:10px;
  padding:13px 12px;
}
```

- [ ] **Step 2: Style the More hub**

```css
.more-hub-grid{display:grid;gap:12px}
.more-hub-card{
  width:100%;min-height:76px;padding:14px;
  display:flex;align-items:center;gap:12px;text-align:left;
  border:1px solid var(--border);border-radius:18px;
  background:var(--card);color:var(--text);box-shadow:var(--shadow-soft);
}
.more-hub-icon{width:44px;height:44px;flex-shrink:0;display:grid;place-items:center;border-radius:14px;background:var(--accent-bg);color:var(--accent)}
.more-hub-icon svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.more-hub-card strong,.more-hub-card small{display:block}
.more-hub-card strong{font-size:14px}
.more-hub-card small{margin-top:3px;font-size:11px;color:var(--text2)}
```

- [ ] **Step 3: Assign nav columns and center the FAB in the final override**

```css
@media (max-width:767px){
  .m-bottomnav{grid-template-columns:repeat(5,minmax(0,1fr))}
  #mn-home{grid-column:1}
  #mn-transactions{grid-column:2}
  #mn-bills{grid-column:4}
  #mn-more{grid-column:5}
  .fab-wrap{
    left:50%;
    right:auto;
    bottom:calc(env(safe-area-inset-bottom,0px) + 22px);
    transform:translateX(-50%);
  }
}
```

- [ ] **Step 4: Verify GREEN and full suite**

Run: `node --test tests/mobile-navbar-layout.test.mjs && npm test`

Expected: all focused and project tests pass.

### Task 4: Validar no site real mobile

**Files:**
- Verify: `index.html`
- Verify: `css/main.css`
- Verify: `js/ui/navigation.js`

- [ ] **Step 1: Reload the real 375 × 812 iframe preview**

Reload `http://localhost:4174/real-mobile-shell.html`, which embeds `http://localhost:4173/`.

Expected: Home, Transactions, Accounts and More surround a centered FAB.

- [ ] **Step 2: Measure geometry in light and dark themes**

Read bounding boxes for `.m-inout`, `#fabBtn` and `.m-bottomnav`.

Expected: card widths differ by at most 0.5 px; FAB center differs from viewport center by at most 0.5 px; no horizontal overflow.

- [ ] **Step 3: Verify navigation behavior**

Click Início, Transações, Contas and Mais. From Mais, open Categorias and Estoque.

Expected: each page opens; More remains active on Categorias and Estoque; the FAB continues opening its radial actions.

- [ ] **Step 4: Final verification**

Run: `npm test && git diff --check`

Expected: all tests pass and no whitespace errors are reported.
