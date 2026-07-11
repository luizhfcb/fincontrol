# Mobile FAB and Transactions Proportion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir a geometria do menu radial e impedir overflow horizontal na tela mobile de transações, mantendo valores monetários completos.

**Architecture:** A correção ficará na camada CSS existente, no bloco final de overrides que já controla o redesign mobile. Um teste Node lerá o CSS como texto e protegerá os contratos responsivos essenciais; a validação funcional e visual será feita no app local em três viewports.

**Tech Stack:** HTML/CSS responsivo, JavaScript vanilla, Node.js `node:test`, navegador in-app.

---

## Estrutura de arquivos

- Criar `tests/mobile-responsive-layout.test.mjs`: contratos de regressão para geometria do FAB e contenção responsiva das transações.
- Modificar `css/main.css`: posições do arco, separação entre centro do botão e rótulo, e regras mobile de largura/flexibilidade.
- Não modificar HTML nem JavaScript: a estrutura e o comportamento existentes já fornecem os elementos necessários.

### Task 1: Registrar os defeitos como testes que falham

**Files:**
- Create: `tests/mobile-responsive-layout.test.mjs`
- Read: `css/main.css`

- [ ] **Step 1: Write the failing tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../css/main.css', import.meta.url), 'utf8');

test('mobile FAB actions use center-based radial coordinates', () => {
  assert.match(css, /\.fab-item\s*\{[^}]*width:54px[^}]*height:54px/s);
  assert.match(css, /\.fab-menu\.show \.fi-income\s*\{[^}]*translate\(0,-124px\)/s);
  assert.match(css, /\.fab-menu\.show \.fi-audio\s*\{[^}]*translate\(-88px,-88px\)/s);
  assert.match(css, /\.fab-menu\.show \.fi-expense\s*\{[^}]*translate\(-124px,0\)/s);
  assert.match(css, /\.fab-label,\s*\[data-theme="light"\] \.fab-label\s*\{[^}]*position:absolute[^}]*top:61px/s);
});

test('mobile transaction ledger contains long complete currency values', () => {
  assert.match(css, /@media\s*\(max-width:\s*430px\)[\s\S]*?\.tx-summary\s*\{[^}]*flex-direction:column/s);
  assert.match(css, /\.tx-summary-flows\s*\{[^}]*width:100%[^}]*justify-content:space-between/s);
  assert.match(css, /\.tx-day-main\s*\{[^}]*flex:1 1 auto[^}]*min-width:0/s);
  assert.match(css, /\.tx-day-label\s*\{[^}]*overflow:hidden[^}]*text-overflow:ellipsis/s);
  assert.match(css, /\.tx-row-right\s*\{[^}]*min-width:0/s);
  assert.match(css, /\.tx-row-amt\s*\{[^}]*font-size:clamp\(12px,3\.7vw,15px\)/s);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/mobile-responsive-layout.test.mjs`

Expected: FAIL because the current FAB item has no fixed center box and the narrow transaction contracts do not exist.

- [ ] **Step 3: Commit the failing regression test**

```bash
git add tests/mobile-responsive-layout.test.mjs
git commit -m "test: cobre proporcao mobile do fab e transacoes"
```

### Task 2: Corrigir geometria e contenção responsiva

**Files:**
- Modify: `css/main.css` in the final `REDESIGN 2026-07` override block
- Test: `tests/mobile-responsive-layout.test.mjs`

- [ ] **Step 1: Make FAB coordinates independent from label height**

Replace the final radial item and coordinate rules with:

```css
.fab-item{
  position:absolute;right:2px;bottom:2px;width:54px;height:54px;
  display:flex;align-items:center;justify-content:center;
  opacity:0;pointer-events:none;
  transform:translate(0,0) scale(.35);
  transition:transform .34s cubic-bezier(.34,1.56,.64,1),opacity .16s ease;
}
.fab-menu.show .fab-item{opacity:1;pointer-events:auto}
.fab-menu.show .fi-income {transform:translate(0,-124px) scale(1);transition-delay:.02s}
.fab-menu.show .fi-audio  {transform:translate(-88px,-88px) scale(1);transition-delay:.07s}
.fab-menu.show .fi-expense{transform:translate(-124px,0) scale(1);transition-delay:.12s}

.fab-label,
[data-theme="light"] .fab-label{
  position:absolute;
  top:61px;
  left:50%;
  transform:translateX(-50%);
  background:transparent !important;
  border:none !important;
  box-shadow:none !important;
  padding:0;
  color:#fff !important;
  font-size:12.5px;
  font-weight:700;
  letter-spacing:.01em;
  text-shadow:0 2px 10px rgba(0,0,0,.65);
}
```

- [ ] **Step 2: Add narrow responsive transaction rules**

Append after the base ledger rules:

```css
@media (max-width:430px) {
  #mp-transactions,
  #mAllTxList,
  #mAllTxList .tx-ledger,
  #mAllTxList .tx-day-card { min-width:0; max-width:100%; }

  .tx-summary {
    flex-direction:column;
    align-items:stretch;
    gap:8px;
    padding:12px 14px;
  }
  .tx-summary-flows {
    width:100%;
    min-width:0;
    justify-content:space-between;
    gap:10px;
    font-size:clamp(11px,3.35vw,13px);
  }
  .tx-day { padding:11px 12px; gap:8px; }
  .tx-day-main { flex:1 1 auto; min-width:0; gap:6px; }
  .tx-day-label {
    min-width:0;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
  }
  .tx-day-net { max-width:45%; font-size:clamp(11px,3.35vw,12px); white-space:nowrap; }
  .tx-row { gap:10px; padding:12px; }
  .tx-row-right { min-width:0; max-width:47%; }
  .tx-row-amt { font-size:clamp(12px,3.7vw,15px); }
}
```

- [ ] **Step 3: Run focused test and verify GREEN**

Run: `node --test tests/mobile-responsive-layout.test.mjs`

Expected: 2 tests pass.

- [ ] **Step 4: Run the full suite**

Run: `npm test`

Expected: all tests pass with no failures.

- [ ] **Step 5: Preserve the pre-existing CSS worktree changes**

Run: `git diff -- css/main.css`

Expected: the new fix is visible alongside the user's pre-existing uncommitted redesign. Do not stage or commit `css/main.css`, because doing so would also capture unrelated work already present in that file.

### Task 3: Validar no navegador e revisar a entrega

**Files:**
- Verify: `css/main.css`
- Verify: `tests/mobile-responsive-layout.test.mjs`

- [ ] **Step 1: Reload the local app at 320 × 800**

Open `http://localhost:4173/`, set viewport to 320 × 800 and verify `scrollWidth === clientWidth` on the transaction page.

Expected: no horizontal overflow; complete amounts remain readable.

- [ ] **Step 2: Validate and capture 375 × 812 previews**

Set viewport to 375 × 812. Capture one screenshot of the transaction page and another with the radial FAB open.

Expected: the summary uses two balanced rows; transaction values stay inside the right edge; Entrada, Voz and Gasto follow a uniform 124 px radius and Gasto shares the FAB horizontal axis.

- [ ] **Step 3: Validate 430 × 932 and both themes**

Set viewport to 430 × 932, toggle light/dark themes and inspect transaction list and FAB.

Expected: no clipping or overlap in either theme.

- [ ] **Step 4: Check runtime errors and final diff**

Run: `git diff --check && git status --short`

Read browser console errors after both interactions.

Expected: no whitespace errors, no new browser errors, and only intended files changed by this implementation.

- [ ] **Step 5: Final verification**

Run: `npm test`

Expected: full suite passes immediately before delivery.
