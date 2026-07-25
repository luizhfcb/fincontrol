import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import { countStockAlerts, listStockAlerts } from '../js/core/stock-alerts.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const modules = {
  stockItems: [
    { id: '1', name: 'Arroz', qty: 0, min: 2 },
    { id: '2', name: 'Café', qty: 2, min: 2 },
    { id: '3', name: 'Sabão', qty: 5, min: 1 },
  ],
};

test('conta itens no mínimo ou abaixo dele', () => {
  assert.equal(countStockAlerts(modules), 2);
  assert.deepEqual(listStockAlerts(modules).map((i) => i.name), ['Arroz', 'Café']);
});

test('módulos ausentes ou vazios não quebram o dashboard', () => {
  assert.equal(countStockAlerts(null), 0);
  assert.equal(countStockAlerts(undefined), 0);
  assert.equal(countStockAlerts({}), 0);
  assert.equal(countStockAlerts({ stockItems: [] }), 0);
});

test('item sem mínimo definido só alerta quando zera', () => {
  assert.equal(countStockAlerts({ stockItems: [{ qty: 1 }] }), 0);
  assert.equal(countStockAlerts({ stockItems: [{ qty: 0 }] }), 1);
});

test('dashboard lê o estoque de state.modules, não de state.stock', () => {
  // Regressão: `state.stock` nunca foi populado e travava o contador em zero.
  const render = readFileSync(join(root, 'js', 'ui', 'render.js'), 'utf8');
  assert.equal(render.includes('state.stock'), false);
  assert.ok(render.includes('countStockAlerts(state.modules)'));
});
