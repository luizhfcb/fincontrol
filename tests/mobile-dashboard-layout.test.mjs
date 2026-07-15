import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../css/main.css', import.meta.url), 'utf8');
const home = html.match(/<div class="m-page active" id="mp-home">([\s\S]*?)<div class="m-page" id="mp-/)?.[1] ?? '';

test('mobile dashboard presents context before the executive summary', () => {
  assert.match(html, /class="m-profile-mini"[\s\S]*id="mAvatarImg"[\s\S]*Bem-vindo de volta,[\s\S]*id="mUserName"/);
  assert.match(html, /class="m-context-row"[\s\S]*id="mMonthBtn"[\s\S]*id="mDashViewWrap"/);
  assert.match(html, /class="m-executive-card"/);
  assert.doesNotMatch(home, /id="mBalanceComparison"/);
  assert.match(home, /class="m-inout-pills"/);
  assert.equal((html.match(/id="mDashViewWrap"/g) || []).length, 1);
});

test('home keeps the view filter in context and the donut always visible', () => {
  assert.doesNotMatch(home, /class="m-section-filter"/);
  assert.match(home, /class="report-head"><span>Gastos por Categoria<\/span>/);
  assert.doesNotMatch(home, /collapse-shell/);
});

test('executive card uses one visual surface and a raised centered FAB', () => {
  assert.match(css, /\.m-executive-card\s*\{[^}]*background:var\(--card\)[^}]*border:1px solid var\(--border\)/s);
  assert.match(css, /\.m-context-row\s*\{[^}]*display:grid/s);
  assert.match(css, /\.m-inout-pills\s*\{/);
  assert.match(css, /bottom:calc\(env\(safe-area-inset-bottom,0px\) \+ 30px\)/);
});

test('mobile month picker stays anchored inside the viewport', () => {
  assert.match(css, /\.m-context-row \.m-monthpick-menu\s*\{[^}]*left:0[^}]*transform:translateY\(-6px\)/s);
  assert.match(css, /\.m-context-row \.m-monthpick-menu\.open\s*\{[^}]*transform:translateY\(0\)/s);
});
