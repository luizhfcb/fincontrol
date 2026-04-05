import test from 'node:test';
import assert from 'node:assert/strict';

let templates = {};

try {
  templates = await import('../js/ui/desktop-module-templates.mjs');
} catch {
  templates = {};
}

const {
  renderDesktopLimitsModule = () => '',
  renderDesktopSubscriptionsModule = () => '',
  renderDesktopBillsModule = () => '',
  renderDesktopStockModule = () => '',
} = templates;

test('renderDesktopLimitsModule creates stitch-like overview layout', () => {
  const html = renderDesktopLimitsModule({
    categories: [
      { name: 'Lazer', type: 'expense' },
      { name: 'Alimentacao', type: 'expense' },
    ],
    limits: [
      { id: '1', category: 'Lazer', spent: 0, limit: 150, pct: 0 },
      { id: '2', category: 'Alimentacao', spent: 845, limit: 1200, pct: 70 },
    ],
    within: 1,
    high: 1,
  });

  assert.match(html, /Limites & Categorias/);
  assert.match(html, /Categorias/);
  assert.match(html, /Resumo de limites/);
  assert.match(html, /Lazer/);
  assert.match(html, /70%/);
});

test('renderDesktopSubscriptionsModule creates overview metrics and list rows', () => {
  const html = renderDesktopSubscriptionsModule({
    subscriptions: [
      { id: '1', name: 'Prime Video', plan: 'Plano Padrao', value: 19.9, day: 5 },
      { id: '2', name: 'Spotify', plan: 'Plano Familia', value: 40.9, day: 5 },
    ],
    totalMonth: 60.8,
  });

  assert.match(html, /Assinaturas/);
  assert.match(html, /TOTAL MENSAL/);
  assert.match(html, /MINHAS ASSINATURAS/);
  assert.match(html, /Prime Video/);
  assert.match(html, /Spotify/);
});

test('renderDesktopBillsModule creates table-style control view', () => {
  const html = renderDesktopBillsModule({
    bills: [
      { id: '1', name: 'Internet', category: 'Despesa Fixa', value: 99.9, day: 5, paid: true },
      { id: '2', name: 'Faculdade', category: 'Despesa Fixa', value: 467, day: 30, paid: false },
    ],
    total: 566.9,
    paid: 99.9,
  });

  assert.match(html, /Controle de Contas/);
  assert.match(html, /PAGO/);
  assert.match(html, /PENDENTE/);
  assert.match(html, /Internet/);
  assert.match(html, /Faculdade/);
});

test('renderDesktopStockModule creates alert, next items and inventory table', () => {
  const html = renderDesktopStockModule({
    stockItems: [
      { id: '1', name: 'Carne Moida', category: 'Acougue', qty: 1.5, min: 1, price: 32, dueIn: 3 },
      { id: '2', name: 'Detergente', category: 'Limpeza', qty: 2, min: 3, price: 8, dueIn: 7 },
    ],
    alerts: [
      { id: '2', name: 'Detergente', category: 'Limpeza', qty: 2, min: 3, price: 8, dueIn: 7 },
    ],
  });

  assert.match(html, /Estoque Doméstico/);
  assert.match(html, /Alertas de reposição/);
  assert.match(html, /Próximas reposições/);
  assert.match(html, /Itens do estoque/);
  assert.match(html, /Detergente/);
});
