import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const charts = await readFile(new URL('../js/ui/charts.js', import.meta.url), 'utf8');
const transactions = await readFile(new URL('../js/ui/tx-list.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../css/main.css', import.meta.url), 'utf8');

test('home donut exposes a calm summary and clickable category legend', () => {
  assert.match(charts, /donut-center-label/);
  // A legenda mostra só nome + porcentagem; o valor aparece no readout ao selecionar.
  assert.match(charts, /donut-legend-percent/);
  assert.match(charts, /selectDonutLegend/);
  assert.doesNotMatch(charts, /donut-legend-value/);
  assert.match(css, /#mobile-app \.donut-hole \.donut-total\.negative[^}]*color:var\(--text\)/s);
});

test('recent transactions use a dedicated category-led presentation', () => {
  assert.match(transactions, /recentTxRowHtml/);
  assert.match(transactions, /recent-tx-item/);
  assert.match(transactions, /recentTransactionDate/);
  assert.match(transactions, /function recentCategoryIcon/);
  assert.match(css, /\.recent-tx-item\s*\{/);
  assert.match(css, /\.recent-tx-icon\s*\{/);
});
