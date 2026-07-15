import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildWeekdaySpending,
  selectAnalyticsPeriodTransactions,
} from '../js/ui/analytics.js';

test('monthly analytics uses the same canonical month/year fields as Home', () => {
  const transactions = [
    { id: 'july-home', month: 6, year: 2026, date: '2026-08-01T02:30:00.000Z' },
    { id: 'june-home', month: 5, year: 2026, date: '2026-07-04T12:00:00.000Z' },
    { id: 'other-year', month: 6, year: 2025, date: '2026-07-10T12:00:00.000Z' },
  ];

  const selected = selectAnalyticsPeriodTransactions(
    transactions,
    'month',
    {},
    6,
    2026,
  );

  assert.deepEqual(selected.currentTransactions.map((transaction) => transaction.id), ['july-home']);
  assert.deepEqual(selected.previousTransactions.map((transaction) => transaction.id), ['june-home']);
});

test('year analytics also respects the canonical year field', () => {
  const transactions = [
    { id: 'current', month: 11, year: 2026, date: '2027-01-01T01:00:00.000Z' },
    { id: 'previous', month: 0, year: 2025, date: '2026-01-01T01:00:00.000Z' },
  ];

  const selected = selectAnalyticsPeriodTransactions(
    transactions,
    'year',
    {},
    6,
    2026,
  );

  assert.deepEqual(selected.currentTransactions.map((transaction) => transaction.id), ['current']);
  assert.deepEqual(selected.previousTransactions.map((transaction) => transaction.id), ['previous']);
});

test('all-time analytics keeps every transaction and has no comparison period', () => {
  const transactions = [
    { id: 'old', month: 0, year: 2024 },
    { id: 'new', month: 6, year: 2026 },
  ];

  const selected = selectAnalyticsPeriodTransactions(transactions, 'all', {});

  assert.deepEqual(selected.currentTransactions.map((transaction) => transaction.id), ['old', 'new']);
  assert.deepEqual(selected.previousTransactions, []);
});

test('daily spending is always grouped from Monday through Sunday', () => {
  const buckets = buildWeekdaySpending([
    { type: 'expense', val: 25, date: '2026-07-13T12:00:00' },
    { type: 'expense', val: 15, date: '2026-07-13T18:00:00' },
    { type: 'expense', val: 30, date: '2026-07-19T12:00:00' },
    { type: 'income', val: 999, date: '2026-07-14T12:00:00' },
  ]);

  assert.deepEqual(buckets.map((bucket) => bucket.label), ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']);
  assert.deepEqual(buckets.map((bucket) => bucket.value), [40, 0, 0, 0, 0, 0, 30]);
});
