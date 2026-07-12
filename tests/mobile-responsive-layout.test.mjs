import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../css/main.css', import.meta.url), 'utf8');

test('mobile FAB actions use center-based radial coordinates', () => {
  assert.match(css, /\.fab-item\s*\{[^}]*width:54px[^}]*height:54px/s);
  assert.match(css, /\.fab-menu\.show \.fi-income\s*\{[^}]*translate\(88px,0\)/s);
  assert.match(css, /\.fab-menu\.show \.fi-audio\s*\{[^}]*translate\(0,-88px\)/s);
  assert.match(css, /\.fab-menu\.show \.fi-expense\s*\{[^}]*translate\(-88px,0\)/s);
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
