import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCategoryBreakdown, buildMonthlyTrend, buildWeekdaySpending, filterTransactions,
  goalProgress, buildLimitProgress, selectPeriodTransactions, buildPeriod, totals,
} from '../src/core/analytics.js';
import { buildDashboardComparison } from '../src/core/dashboard-comparison.mjs';

const tx = (o) => ({ type: 'expense', cat: 'Outros', val: 10, desc: 'x', ...o });
const at = (y, m, d) => ({ date: new Date(y, m, d, 12).toISOString(), month: m, year: y });

test('totals separa receita, despesa e saldo', () => {
  const t = totals([tx({ type: 'income', val: 100 }), tx({ val: 30 }), tx({ val: 20 })]);
  assert.deepEqual(t, { income: 100, expense: 50, balance: 50 });
});

test('breakdown agrupa por categoria e soma 100%', () => {
  const rows = buildCategoryBreakdown([tx({ cat: 'A', val: 75 }), tx({ cat: 'B', val: 25 })]);
  assert.equal(rows[0].cat, 'A');
  assert.equal(Math.round(rows.reduce((s, r) => s + r.percent, 0)), 100);
});

test('weekday: segunda é o índice 0 e domingo o 6', () => {
  const mon = tx({ ...at(2026, 10, 9), val: 5 }); // 09/11/2026 é segunda
  const sun = tx({ ...at(2026, 10, 15), val: 7 });
  const w = buildWeekdaySpending([mon, sun]);
  assert.equal(w[0].value, 5);
  assert.equal(w[6].value, 7);
});

test('filtros avançados combinam texto, categoria, valor e datas', () => {
  const list = [
    tx({ desc: 'Mercado', cat: 'Alimentação', val: 100, ...at(2026, 10, 3) }),
    tx({ desc: 'Mercado', cat: 'Alimentação', val: 20, ...at(2026, 10, 20) }),
    tx({ desc: 'Uber', cat: 'Transporte', val: 30, ...at(2026, 10, 5) }),
  ];
  assert.equal(filterTransactions(list, { query: 'merc' }).length, 2);
  assert.equal(filterTransactions(list, { cat: 'Transporte' }).length, 1);
  assert.equal(filterTransactions(list, { min: 50 }).length, 1);
  assert.equal(filterTransactions(list, { from: '2026-11-04', to: '2026-11-30' }).length, 2);
});

test('seleção de período mês usa month/year e compara com o anterior', () => {
  const list = [tx(at(2026, 10, 2)), tx(at(2026, 9, 28)), tx(at(2026, 8, 1))];
  const def = buildPeriod('month', 10, 2026);
  const { current, previous } = selectPeriodTransactions(list, 'month', def, 10, 2026);
  assert.equal(current.length, 1);
  assert.equal(previous.length, 1);
  assert.equal(def.previousLabel, 'Outubro');
});

test('tendência cobre 6 meses atravessando a virada de ano', () => {
  const trend = buildMonthlyTrend([], 1, 2026, 6);
  assert.equal(trend.length, 6);
  assert.deepEqual([trend[0].month, trend[0].year], [8, 2025]);
});

test('limite: status ok/warn/over', () => {
  const spent = [tx({ cat: 'A', val: 85 })];
  const [r] = buildLimitProgress([{ id: '1', category: 'A', limit: 100 }], spent);
  assert.equal(r.status, 'warn');
});

test('meta: progresso e valor mensal necessário', () => {
  const g = goalProgress({ target: 1200, saved: 600, deadline: '2027-01-01' }, new Date(2026, 6, 10));
  assert.equal(g.percent, 50);
  assert.equal(g.remaining, 600);
  assert.equal(Math.round(g.monthlyNeeded), 100);
});

test('comparação do dashboard (core original)', () => {
  assert.equal(buildDashboardComparison(120, 100, 'Out').percent, 20);
  assert.equal(buildDashboardComparison(10, 0, 'Out'), null);
});
