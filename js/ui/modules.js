import { state } from '../core/state.js';
import { formatCurrency } from '../core/utils.js';

const STORAGE_KEY = 'fincontrol_modules_v1';

const defaultData = {
  categories: [
    { name: 'Moradia', type: 'Desp' },
    { name: 'Alimentação', type: 'Desp' },
    { name: 'Transporte', type: 'Desp' },
    { name: 'Saúde', type: 'Desp' },
    { name: 'Lazer', type: 'Desp' },
    { name: 'Educação', type: 'Desp' },
    { name: 'Vestuário', type: 'Desp' },
    { name: 'Salário', type: 'Rec' },
  ],
  limits: [
    { category: 'Alimentação', limit: 500 },
    { category: 'Lazer', limit: 200 },
    { category: 'Transporte', limit: 300 },
  ],
  subscriptions: [
    { id: crypto.randomUUID(), name: 'Netflix', value: 39.9, day: 15, plan: 'Plano família' },
    { id: crypto.randomUUID(), name: 'Spotify', value: 21.9, day: 18, plan: 'Plano individual' },
  ],
  stockItems: [
    { id: crypto.randomUUID(), name: 'Detergente', category: 'Limpeza', qty: 1, min: 2, price: 15, dueIn: -1 },
    { id: crypto.randomUUID(), name: 'Sabão em Pó', category: 'Limpeza', qty: 0, min: 1, price: 28, dueIn: 29 },
    { id: crypto.randomUUID(), name: 'Shampoo', category: 'Higiene', qty: 3, min: 1, price: 20, dueIn: 8 },
  ],
  bills: [
    { id: crypto.randomUUID(), name: 'Internet', category: 'Moradia', day: 5, value: 100, paid: false },
    { id: crypto.randomUUID(), name: 'Aluguel', category: 'Moradia', day: 10, value: 1200, paid: false },
    { id: crypto.randomUUID(), name: 'Conta de Luz', category: 'Moradia', day: 20, value: 150, paid: false },
  ],
};

export function initModules() {
  if (!state.modules) {
    state.modules = loadData();
  }
  renderModules();
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultData);
    return { ...structuredClone(defaultData), ...JSON.parse(raw) };
  } catch {
    return structuredClone(defaultData);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.modules));
}

export function renderModules() {
  renderLimits();
  renderSubscriptions();
  renderStock();
  renderBills();
}

function expensesByCategory() {
  const monthlyExpenses = state.transactions.filter((t) => (
    t.type === 'expense' && t.month === state.currentMonth && t.year === state.currentYear
  ));

  return monthlyExpenses.reduce((acc, t) => {
    acc[t.cat] = (acc[t.cat] || 0) + t.val;
    return acc;
  }, {});
}

function renderLimits() {
  const el = document.getElementById('dp-limits');
  if (!el) return;

  const spentMap = expensesByCategory();
  const limits = state.modules.limits;
  const within = limits.filter((item) => (spentMap[item.category] || 0) <= item.limit).length;
  const high = limits.filter((item) => ((spentMap[item.category] || 0) / item.limit) >= 0.7).length;

  el.innerHTML = `
    <div class="module-head"><h2>🏷️ Limites & Categorias</h2></div>
    <div class="module-grid two">
      <div class="module-card">
        <h3>🏷️ Categorias</h3>
        <div class="chip-wrap">${state.modules.categories.map((c) => `<span class="chip">${c.name} <small>${c.type}</small></span>`).join('')}</div>
      </div>
      <div class="module-card">
        <h3>🎯 Limites por categoria</h3>
        <div class="list-wrap">
          ${limits.map((item) => {
            const spent = spentMap[item.category] || 0;
            const pct = Math.min(100, Math.round((spent / item.limit) * 100));
            return `<div class="limit-row"><div><strong>${item.category}</strong><small>Gasto: ${formatCurrency(spent)} / ${formatCurrency(item.limit)}</small></div><span>${pct}%</span><div class="progress"><i style="width:${pct}%"></i></div></div>`;
          }).join('')}
        </div>
      </div>
      <div class="module-card">
        <h3>📊 Resumo de limites</h3>
        <div class="notice ok">• ${within} categorias dentro do limite</div>
        <div class="notice warn">• ${high} categorias acima de 70%</div>
      </div>
    </div>`;
}

function renderSubscriptions() {
  const el = document.getElementById('dp-subscriptions');
  if (!el) return;
  const totalMonth = state.modules.subscriptions.reduce((sum, s) => sum + s.value, 0);

  el.innerHTML = `
  <div class="module-head"><h2>📱 Assinaturas</h2></div>
  <div class="module-grid three">
    <div class="module-card metric"><label>Total mensal</label><strong>${formatCurrency(totalMonth)}</strong></div>
    <div class="module-card metric"><label>Total anual</label><strong>${formatCurrency(totalMonth * 12)}</strong></div>
    <div class="module-card metric"><label>Nº de assinaturas</label><strong>${state.modules.subscriptions.length}</strong></div>
  </div>
  <div class="module-card">
    <h3>🎬 Minhas Assinaturas</h3>
    <div class="list-wrap">
      ${state.modules.subscriptions.map((s) => `<div class="sub-row"><div><strong>${s.name}</strong><small>${s.plan}</small></div><div><strong>${formatCurrency(s.value)}/mês</strong><small>Desconto dia ${s.day}</small></div></div>`).join('')}
    </div>
  </div>`;
}

function renderStock() {
  const el = document.getElementById('dp-stock');
  if (!el) return;
  const alerts = state.modules.stockItems.filter((i) => i.qty <= i.min);

  el.innerHTML = `
  <div class="module-head"><h2>📦 Estoque Doméstico</h2></div>
  <div class="module-grid two">
    <div class="module-card"><h3>🚨 Alertas de reposição</h3><div class="list-wrap">${alerts.map((a) => `<div class="notice ${a.qty === 0 ? 'danger' : 'warn'}">${a.name} — estoque ${a.qty === 0 ? 'zerado' : 'baixo'}</div>`).join('') || '<div class="notice ok">Sem alertas no momento</div>'}</div></div>
    <div class="module-card"><h3>📅 Próximas reposições</h3><div class="list-wrap">${state.modules.stockItems.map((i) => `<div class="sub-row"><div><strong>${i.name}</strong><small>${i.dueIn < 0 ? 'Vencido' : `Em ${i.dueIn} dias`}</small></div><strong>${formatCurrency(i.price)}</strong></div>`).join('')}</div></div>
  </div>
  <div class="module-card"><h3>📦 Itens do estoque</h3><div class="stock-grid">${state.modules.stockItems.map((i) => `<div class="stock-item"><strong>${i.name}</strong><small>${i.category}</small><div class="progress"><i style="width:${Math.min(100, (i.qty / Math.max(1, i.min)) * 100)}%"></i></div><p>${i.qty} un. (mín ${i.min})</p></div>`).join('')}</div></div>`;
}

function renderBills() {
  const el = document.getElementById('dp-bills');
  if (!el) return;
  const total = state.modules.bills.reduce((sum, b) => sum + b.value, 0);
  const paid = state.modules.bills.filter((b) => b.paid).reduce((sum, b) => sum + b.value, 0);

  el.innerHTML = `
  <div class="module-head"><h2>🗓️ Controle de Contas Pagas</h2></div>
  <div class="module-card">
    <div class="bill-summary"><span class="ok">✓ Pago: ${formatCurrency(paid)}</span><span class="danger">✗ Pendente: ${formatCurrency(total - paid)}</span><span>Total: ${formatCurrency(total)}</span></div>
    <table class="bill-table"><thead><tr><th>Conta</th><th>Categoria</th><th>Vencimento</th><th>Valor</th><th>Pago?</th></tr></thead>
    <tbody>${state.modules.bills.map((b) => `<tr><td>${b.name}</td><td>${b.category}</td><td>Dia ${b.day}</td><td>${formatCurrency(b.value)}</td><td><input type="checkbox" ${b.paid ? 'checked' : ''} onchange="toggleBillPaid('${b.id}', this.checked)"></td></tr>`).join('')}</tbody></table>
  </div>`;
}

export function toggleBillPaid(id, paid) {
  const bill = state.modules.bills.find((b) => b.id === id);
  if (!bill) return;
  bill.paid = paid;
  persist();
  renderBills();
}
