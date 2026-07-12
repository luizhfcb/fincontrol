import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../css/main.css', import.meta.url), 'utf8');

test('mobile dashboard presents context before the executive summary', () => {
  assert.match(html, /class="m-topbar-brand"/);
  assert.match(html, /class="m-context-row"[\s\S]*id="mMonthBtn"[\s\S]*id="mDashViewWrap"/);
  assert.match(html, /class="m-executive-card"/);
  assert.match(html, /id="mBalanceComparison"/);
  assert.equal((html.match(/id="mDashViewWrap"/g) || []).length, 1);
});

test('reports heading no longer owns the global dashboard filter', () => {
  const reports = html.match(/<div class="m-section-filter">([\s\S]*?)<\/div>/)?.[1] ?? '';
  assert.match(reports, /Relatórios/);
  assert.doesNotMatch(reports, /mDashViewWrap/);
  assert.doesNotMatch(html, /class="m-period"/);
});

test('executive card uses one visual surface and a raised centered FAB', () => {
  assert.match(css, /\.m-executive-card\s*\{[^}]*background:var\(--card\)[^}]*border:1px solid var\(--border\)/s);
  assert.match(css, /\.m-context-row\s*\{[^}]*display:grid/s);
  assert.match(css, /\.m-balance-comparison\s*\{/);
  assert.match(css, /bottom:calc\(env\(safe-area-inset-bottom,0px\) \+ 30px\)/);
});

test('mobile month picker stays anchored inside the viewport', () => {
  assert.match(css, /\.m-context-row \.m-monthpick-menu\s*\{[^}]*left:0[^}]*transform:translateY\(-6px\)/s);
  assert.match(css, /\.m-context-row \.m-monthpick-menu\.open\s*\{[^}]*transform:translateY\(0\)/s);
});
