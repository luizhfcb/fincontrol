import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDayDetail, buildDescriptionHistory, buildHeatmap, buildMonthStats,
  buildWeekdayAverage, compactDonutCategories, heatmapTone, trendInsight,
} from '../src/core/insights.js';

const exp = (y, m, d, val, extra = {}) => ({
  type: 'expense', cat: 'Outros', desc: 'x', val,
  date: new Date(y, m, d, 12).toISOString(), month: m, year: y, ...extra,
});

test('donut: agrupa excedente em "+N categorias" e nunca em "Outros"', () => {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'Outros'].map((cat, i) => ({ cat, value: 80 - i * 10 }));
  const out = compactDonutCategories(rows, 6);
  assert.equal(out.length, 6);
  assert.equal(out[5].cat, '+3 categorias');
  assert.deepEqual(out[5].grouped, ['F', 'G', 'Outros']);
  assert.equal(Math.round(out.reduce((s, r) => s + r.percent, 0)), 100);
});

test('donut: ignora categorias sem valor', () => {
  assert.equal(compactDonutCategories([{ cat: 'A', value: 10 }, { cat: 'B', value: 0 }]).length, 1);
});

test('heatmap: tonalização por quantil e dia sem gasto neutro', () => {
  const sorted = [10, 20, 30, 40];
  assert.equal(heatmapTone(0, sorted), 0);
  assert.equal(heatmapTone(10, sorted), 1);
  assert.equal(heatmapTone(40, sorted), 4);
});

test('heatmap: soma por dia, média por dia ativo e insight do dia da semana', () => {
  // nov/2026: dia 6 e 13 são sextas
  const txs = [exp(2026, 10, 6, 100), exp(2026, 10, 13, 50), exp(2026, 10, 2, 50), { ...exp(2026, 10, 2, 999), type: 'income' }];
  const h = buildHeatmap(txs, 10, 2026, new Date(2026, 10, 20));
  assert.equal(h.daysInMonth, 30);
  assert.equal(h.totalMonth, 200);
  assert.equal(h.activeDays, 3);
  assert.equal(h.insight.label, 'Sexta');
  assert.equal(h.insight.share, 75);
  assert.equal(h.isCurrentMonth, true);
});

test('detalhe do dia: maior compra, composição e multiplicador', () => {
  const txs = [exp(2026, 10, 6, 30, { desc: 'a' }), exp(2026, 10, 6, 90, { desc: 'b' }), exp(2026, 10, 9, 40)];
  const h = buildHeatmap(txs, 10, 2026);
  const d = buildDayDetail(h, 6);
  assert.equal(d.biggest.desc, 'b');
  assert.equal(d.composition[0].pct, 75);
  assert.equal(d.multiplier.toFixed(1), '1.5');
});

test('média por dia da semana divide pelas ocorrências do dia no mês', () => {
  // nov/2026 tem 5 domingos (1, 8, 15, 22, 29)
  const w = buildWeekdayAverage([exp(2026, 10, 1, 100), exp(2026, 10, 8, 150)], 10, 2026);
  const sunday = w.rows.find((r) => r.dow === 0);
  assert.equal(sunday.avg, 50);
  assert.equal(w.rows[0].label, 'Seg');
  assert.equal(w.phrase, 'aos domingos');
});

test('tendência: compara mês atual com a média', () => {
  assert.equal(trendInsight([{ expense: 100 }, { expense: 50 }]).status, 'below');
  assert.equal(trendInsight([{ expense: 50 }, { expense: 100 }]).status, 'above');
  assert.equal(trendInsight([{ expense: 0 }]).status, 'none');
});

test('mini stats e histórico por descrição', () => {
  const txs = [exp(2026, 10, 1, 10, { desc: 'Uber' }), exp(2026, 10, 1, 30, { desc: 'Mercado' }), { ...exp(2026, 10, 3, 5, { desc: 'Uber' }), type: 'income' }];
  const s = buildMonthStats(txs);
  assert.equal(s.activeDays, 2);
  assert.equal(s.biggest.desc, 'Mercado');
  const h = buildDescriptionHistory(txs, 'Uber');
  assert.equal(h.items.length, 2);
  assert.equal(h.net, -5);
});
