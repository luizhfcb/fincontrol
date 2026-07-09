import test from 'node:test';
import assert from 'node:assert/strict';

import { formatCompactCurrency, getMonthlyTransactions } from '../js/core/utils.js';
import { state } from '../js/core/state.js';

test('formatCompactCurrency mantém o cifrão em valores compactos', () => {
  assert.equal(formatCompactCurrency(5400), 'R$5,4k');
  assert.equal(formatCompactCurrency(1000), 'R$1k');
  assert.equal(formatCompactCurrency(1050), 'R$1,1k');
});

test('formatCompactCurrency formata valores abaixo de mil', () => {
  assert.equal(formatCompactCurrency(999), 'R$999');
  assert.equal(formatCompactCurrency(0), 'R$0');
  assert.equal(formatCompactCurrency(null), 'R$0');
});

test('getMonthlyTransactions filtra pelo mês/ano em exibição', () => {
  state.currentMonth = 6;
  state.currentYear = 2026;
  state.transactions = [
    { id: 'a', month: 6, year: 2026, val: 10 },
    { id: 'b', month: 5, year: 2026, val: 20 },
    { id: 'c', month: 6, year: 2025, val: 30 },
  ];

  const monthly = getMonthlyTransactions();
  assert.deepEqual(monthly.map((t) => t.id), ['a']);
});
