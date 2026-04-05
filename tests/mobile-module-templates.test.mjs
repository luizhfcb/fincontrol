import test from 'node:test';
import assert from 'node:assert/strict';

let templates = {};

try {
  templates = await import('../js/ui/mobile-module-templates.mjs');
} catch {
  templates = {};
}

const {
  renderMobileSubscriptionsModule = () => '',
  renderMobileBillsModule = () => '',
  renderMobileLimitsModule = () => '',
  renderMobileStockModule = () => '',
} = templates;

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format(value);

test('renderMobileSubscriptionsModule creates hero and styled subscription cards', () => {
  const html = renderMobileSubscriptionsModule({
    subscriptions: [
      { id: '1', name: 'Prime Video', plan: 'Streaming', value: 19.9, day: 5 },
      { id: '2', name: 'Spotify Family', plan: 'Plano família', value: 34.9, day: 12 },
    ],
    totalMonth: 54.8,
  });

  assert.match(html, /Assinaturas Ativas/);
  assert.match(html, /Nova assinatura/);
  assert.match(html, /mobile-module-hero subscriptions-hero/);
  assert.match(html, /mobile-entry-card/);
  assert.match(html, /Prime Video/);
  assert.match(html, /Spotify Family/);
  assert.ok(html.includes(formatCurrency(19.9)));
  assert.match(html, /PAGO/);
  assert.match(html, /mobile-icon-action/);
  assert.doesNotMatch(html, />Editar</);
  assert.doesNotMatch(html, />Remover</);
});

test('renderMobileBillsModule creates summary hero and bill status cards', () => {
  const html = renderMobileBillsModule({
    bills: [
      { id: '1', name: 'AWS Cloud Services', category: 'Infraestrutura Mensal', value: 2450, day: 12, paid: true },
      { id: '2', name: 'Aluguel Sede SP', category: 'Escritório Central', value: 8500, day: 6, paid: false },
    ],
    totalBills: 10950,
    paidBills: 2450,
  });

  assert.match(html, /Próximos Vencimentos/);
  assert.match(html, /Ver histórico/);
  assert.match(html, /mobile-module-hero bills-hero/);
  assert.match(html, /PENDENTE/);
  assert.match(html, /AWS Cloud Services/);
  assert.match(html, /Aluguel Sede SP/);
  assert.match(html, /22%/);
  assert.match(html, /\+ Nova conta/);
  assert.match(html, /mobile-icon-action/);
  assert.doesNotMatch(html, />Editar</);
  assert.doesNotMatch(html, />Remover</);
});

test('renderMobileLimitsModule creates a styled limits overview and cards', () => {
  const html = renderMobileLimitsModule({
    limits: [
      { id: '1', category: 'Alimentacao', limit: 800, spent: 520, pct: 65 },
      { id: '2', category: 'Lazer', limit: 300, spent: 270, pct: 90 },
    ],
  });

  assert.match(html, /Limites em foco/);
  assert.match(html, /Novo limite/);
  assert.match(html, /mobile-module-hero limits-hero/);
  assert.match(html, /Alimentacao/);
  assert.match(html, /Lazer/);
  assert.match(html, /65%/);
  assert.match(html, /90%/);
});

test('renderMobileStockModule creates a styled stock summary and cards', () => {
  const html = renderMobileStockModule({
    stockItems: [
      { id: '1', name: 'Arroz', category: 'Despensa', qty: 3, min: 2 },
      { id: '2', name: 'Detergente', category: 'Limpeza', qty: 1, min: 3 },
    ],
    alerts: 1,
  });

  assert.match(html, /Estoque ativo/);
  assert.match(html, /Novo item/);
  assert.match(html, /mobile-module-hero stock-hero/);
  assert.match(html, /Arroz/);
  assert.match(html, /Detergente/);
  assert.match(html, /baixo estoque/);
  assert.match(html, /Despensa/);
});
