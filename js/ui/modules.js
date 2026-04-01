import { state } from '../core/state.js';
import { formatCurrency } from '../core/utils.js';
import { showToast } from './feedback.js';
import { db, doc, onSnapshot, setDoc } from '../config/firebase.js';

const STORAGE_KEY = 'fincontrol_modules_v1';
const MODULES_DOC_TYPE = 'modules_state';
const MODULES_COLLECTION = 'transactions';

const defaultData = {
  categories: [],
  limits: [],
  subscriptions: [],
  stockItems: [],
  bills: [],
};

export function initModules() {
  if (!state.currentUser) {
    if (!state.modules) state.modules = loadData();
    renderModules();
    return;
  }

  if (state.unsubscribeModules) {
    state.unsubscribeModules();
  }

  const docRef = doc(db, MODULES_COLLECTION, `${state.currentUser.uid}_modules`);
  state.unsubscribeModules = onSnapshot(docRef, async (snapshot) => {
    if (!snapshot.exists()) {
      state.modules = loadData();
      await setDoc(docRef, {
        uid: state.currentUser.uid,
        _docType: MODULES_DOC_TYPE,
        ...state.modules,
      });
      state.modulesDocId = `${state.currentUser.uid}_modules`;
      persistLocal();
      renderModules();
      return;
    }
    state.modulesDocId = snapshot.id;
    state.modules = { ...cloneDefaults(), ...snapshot.data() };
    persistLocal();
    renderModules();
  }, () => {
    state.modules = loadData();
    renderModules();
    showToast('Erro ao conectar módulos na nuvem.', true);
  });
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaults();
    const parsed = JSON.parse(raw);
    return {
      ...cloneDefaults(),
      ...parsed,
      categories: parsed.categories || cloneDefaults().categories,
      limits: parsed.limits || cloneDefaults().limits,
      subscriptions: parsed.subscriptions || cloneDefaults().subscriptions,
      stockItems: parsed.stockItems || cloneDefaults().stockItems,
      bills: parsed.bills || cloneDefaults().bills,
    };
  } catch {
    return cloneDefaults();
  }
}
const cloneDefaults = () => JSON.parse(JSON.stringify(defaultData));

function persistLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.modules));
}

async function persist() {
  persistLocal();
  if (!state.currentUser) return;
  const modulesDocId = `${state.currentUser.uid}_modules`;
  try {
    await setDoc(doc(db, MODULES_COLLECTION, modulesDocId), {
      uid: state.currentUser.uid,
      _docType: MODULES_DOC_TYPE,
      ...state.modules,
    });
    state.modulesDocId = modulesDocId;
  } catch {
    showToast('Erro ao salvar módulos na nuvem.', true);
  }
}

export function renderModules() {
  if (!state.modules) return;
  renderLimits();
  renderSubscriptions();
  renderStock();
  renderBills();
  renderMobileModules();
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
  const dMini = document.getElementById('dLimitsMini');
  const mMini = document.getElementById('mLimitsMini');
  
  const spentMap = expensesByCategory();
  const limits = state.modules ? state.modules.limits : [];
  
  const miniHtml = limits.map((item) => {
      const spent = spentMap[item.category] || 0;
      const pct = Math.min(100, Math.round((spent / item.limit) * 100));
      return `<div class="limit-row" style="margin-bottom:8px; border:none; padding:4px 0;"><div><strong style="font-size:13px">${item.category}</strong><small style="font-size:10px">${pct}% usado</small></div><div class="progress"><i style="width:${pct}%"></i></div></div>`;
  }).join('') || '<div class="empty">Nenhum limite configurado</div>';

  if (dMini) dMini.innerHTML = miniHtml;
  if (mMini) mMini.innerHTML = miniHtml;

  if (!el) return;

  const within = limits.filter((item) => (spentMap[item.category] || 0) <= item.limit).length;
  const high = limits.filter((item) => ((spentMap[item.category] || 0) / item.limit) >= 0.7).length;

  el.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:14px;">
      <h2 style="font-size:28px; font-weight:900; letter-spacing:-0.04em;">🏷️ Limites & Categorias</h2>
      <button class="list-btn" onclick="addLimit()">+ Novo Limite</button>
    </div>
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
            return `<div class="limit-row"><div><strong>${item.category}</strong><small>Gasto: ${formatCurrency(spent)} / ${formatCurrency(item.limit)}</small></div><div style="display:flex; align-items:center; gap:12px;"><span>${pct}%</span><button onclick="removeLimit('${item.id}')" style="background:transparent; border:none; color:var(--text3); cursor:pointer">🗑</button></div><div class="progress"><i style="width:${pct}%"></i></div></div>`;
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
  <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:14px;">
    <h2 style="font-size:28px; font-weight:900; letter-spacing:-0.04em;">📱 Assinaturas</h2>
    <button class="list-btn" onclick="addSubscription()">+ Nova</button>
  </div>
  <div class="module-grid three">
    <div class="module-card metric"><label>Total mensal</label><strong>${formatCurrency(totalMonth)}</strong></div>
    <div class="module-card metric"><label>Total anual</label><strong>${formatCurrency(totalMonth * 12)}</strong></div>
    <div class="module-card metric"><label>Nº de assinaturas</label><strong>${state.modules.subscriptions.length}</strong></div>
  </div>
  <div class="module-card">
    <h3>🎬 Minhas Assinaturas</h3>
    <div class="list-wrap">
      ${state.modules.subscriptions.map((s) => `<div class="sub-row"><div><strong>${s.name}</strong><small>${s.plan}</small></div><div style="text-align:right"><strong>${formatCurrency(s.value)}/mês</strong><small>Desconto dia ${s.day} <button onclick="removeSubscription('${s.id}')" style="background:transparent; border:none; color:var(--text3); cursor:pointer; margin-left:6px">🗑</button></small></div></div>`).join('')}
    </div>
  </div>`;
}

function renderStock() {
  const el = document.getElementById('dp-stock');
  if (!el) return;
  const alerts = state.modules.stockItems.filter((i) => i.qty <= i.min);

  el.innerHTML = `
  <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:14px;">
    <h2 style="font-size:28px; font-weight:900; letter-spacing:-0.04em;">📦 Estoque Doméstico</h2>
    <button class="list-btn" onclick="addStockItem()">+ Item</button>
  </div>
  <div class="module-grid two">
    <div class="module-card"><h3>🚨 Alertas de reposição</h3><div class="list-wrap">${alerts.map((a) => `<div class="notice ${a.qty === 0 ? 'danger' : 'warn'}">${a.name} — estoque ${a.qty === 0 ? 'zerado' : 'baixo'}</div>`).join('') || '<div class="notice ok">Sem alertas no momento</div>'}</div></div>
    <div class="module-card"><h3>📅 Próximas reposições</h3><div class="list-wrap">${state.modules.stockItems.map((i) => `<div class="sub-row"><div><strong>${i.name}</strong><small>${i.dueIn < 0 ? 'Vencido' : `Em ${i.dueIn} dias`}</small></div><strong>${formatCurrency(i.price)}</strong></div>`).join('')}</div></div>
  </div>
  <div class="module-card"><h3>📦 Itens do estoque</h3><div class="stock-grid">${state.modules.stockItems.map((i) => `<div class="stock-item"><div style="display:flex; justify-content:space-between"><strong>${i.name}</strong> <button onclick="removeStockItem('${i.id}')" style="background:transparent; border:none; color:var(--text3); cursor:pointer">🗑</button></div><small>${i.category}</small><div class="progress"><i style="width:${Math.min(100, (i.qty / Math.max(1, i.min)) * 100)}%"></i></div><div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px"><p style="margin:0">${i.qty} un. (mín ${i.min})</p><div><button onclick="changeStockQty('${i.id}', -1)" style="padding:2px 6px; border-radius:4px">-</button> <button onclick="changeStockQty('${i.id}', 1)" style="padding:2px 6px; border-radius:4px">+</button></div></div></div>`).join('')}</div></div>`;
}

function renderBills() {
  const el = document.getElementById('dp-bills');
  if (!el) return;
  const total = state.modules.bills.reduce((sum, b) => sum + b.value, 0);
  const paid = state.modules.bills.filter((b) => b.paid).reduce((sum, b) => sum + b.value, 0);

  el.innerHTML = `
  <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:14px;">
    <h2 style="font-size:28px; font-weight:900; letter-spacing:-0.04em;">🗓️ Controle de Contas</h2>
    <button class="list-btn" onclick="addBill()">+ Conta</button>
  </div>
  <div class="module-card">
    <div class="bill-summary"><span class="ok">✓ Pago: ${formatCurrency(paid)}</span><span class="danger">✗ Pendente: ${formatCurrency(total - paid)}</span><span>Total: ${formatCurrency(total)}</span></div>
    <table class="bill-table" style="width:100%"><thead><tr><th>Conta</th><th>Categoria</th><th>Vencimento</th><th>Valor</th><th>Pago?</th><th></th></tr></thead>
    <tbody>${state.modules.bills.map((b) => `<tr><td>${b.name}</td><td>${b.category}</td><td>Dia ${b.day}</td><td>${formatCurrency(b.value)}</td><td><input type="checkbox" ${b.paid ? 'checked' : ''} onchange="toggleBillPaid('${b.id}', this.checked)"></td><td><button onclick="removeBill('${b.id}')" style="background:transparent; border:none; color:var(--text3); cursor:pointer">🗑</button></td></tr>`).join('')}</tbody></table>
  </div>`;
}

function renderMobileModules() {
  const limitsEl = document.getElementById('mLimitsPage');
  const subscriptionsEl = document.getElementById('mSubscriptionsPage');
  const billsEl = document.getElementById('mBillsPage');
  const stockEl = document.getElementById('mStockPage');
  if (!limitsEl || !subscriptionsEl || !billsEl || !stockEl) return;

  const totalMonth = state.modules.subscriptions.reduce((sum, s) => sum + s.value, 0);
  const alerts = state.modules.stockItems.filter((i) => i.qty <= i.min).length;
  const totalBills = state.modules.bills.reduce((sum, b) => sum + b.value, 0);
  const paidBills = state.modules.bills.filter((b) => b.paid).reduce((sum, b) => sum + b.value, 0);
  const spentMap = expensesByCategory();

  limitsEl.innerHTML = `
    <button class="list-btn" style="margin-bottom:10px" onclick="addLimit()">+ Novo limite</button>
    <div class="list-wrap">
      ${state.modules.limits.map((item) => {
        const spent = spentMap[item.category] || 0;
        const pct = Math.min(100, Math.round((spent / item.limit) * 100));
        return `<div class="limit-row"><div><strong>${item.category}</strong><small>${formatCurrency(spent)} de ${formatCurrency(item.limit)}</small></div><div style="display:flex;align-items:center;gap:8px"><span>${pct}%</span><button onclick="removeLimit('${item.id}')" class="mini-action">🗑</button></div><div class="progress"><i style="width:${pct}%"></i></div></div>`;
      }).join('') || '<div class="empty">Nenhum limite configurado</div>'}
    </div>`;

  subscriptionsEl.innerHTML = `
    <button class="list-btn" style="margin-bottom:10px" onclick="addSubscription()">+ Nova assinatura</button>
    <div class="notice ok" style="margin-bottom:10px">${state.modules.subscriptions.length} assinatura(s) · ${formatCurrency(totalMonth)}/mês</div>
    <div class="list-wrap">
      ${state.modules.subscriptions.map((s) => `<div class="sub-row"><div><strong>${s.name}</strong><small>${s.plan}</small></div><div style="text-align:right"><strong>${formatCurrency(s.value)}</strong><small>Dia ${s.day} <button onclick="removeSubscription('${s.id}')" class="mini-action">🗑</button></small></div></div>`).join('') || '<div class="empty">Nenhuma assinatura</div>'}
    </div>`;

  billsEl.innerHTML = `
    <button class="list-btn" style="margin-bottom:10px" onclick="addBill()">+ Nova conta</button>
    <div class="notice warn" style="margin-bottom:10px">Pago ${formatCurrency(paidBills)} de ${formatCurrency(totalBills)}</div>
    <div class="list-wrap">
      ${state.modules.bills.map((b) => `<div class="sub-row"><div><strong>${b.name}</strong><small>Vence dia ${b.day}</small></div><div style="display:flex;align-items:center;gap:8px"><input type="checkbox" ${b.paid ? 'checked' : ''} onchange="toggleBillPaid('${b.id}', this.checked)"><button onclick="removeBill('${b.id}')" class="mini-action">🗑</button></div></div>`).join('') || '<div class="empty">Sem contas cadastradas</div>'}
    </div>`;

  stockEl.innerHTML = `
    <button class="list-btn" style="margin-bottom:10px" onclick="addStockItem()">+ Novo item</button>
    <div class="notice ${alerts ? 'warn' : 'ok'}" style="margin-bottom:10px">${alerts} alerta(s) em ${state.modules.stockItems.length} item(ns)</div>
    <div class="list-wrap">
      ${state.modules.stockItems.map((i) => `<div class="sub-row"><div><strong>${i.name}</strong><small>${i.qty} un. (mín ${i.min})</small></div><div style="display:flex;align-items:center;gap:6px"><button onclick="changeStockQty('${i.id}', -1)" class="mini-action">-</button><button onclick="changeStockQty('${i.id}', 1)" class="mini-action">+</button><button onclick="removeStockItem('${i.id}')" class="mini-action">🗑</button></div></div>`).join('') || '<div class="empty">Sem itens no estoque</div>'}
    </div>`;
}

export function toggleBillPaid(id, paid) {
  const bill = state.modules.bills.find((b) => b.id === id);
  if (!bill) return;
  bill.paid = paid;
  persist();
  renderModules();
}

export function addSubscription() {
  openModuleForm({
    title: 'Nova assinatura',
    fields: [
      { name: 'name', label: 'Nome da assinatura', placeholder: 'Ex: Netflix', required: true },
      { name: 'plan', label: 'Plano', placeholder: 'Ex: Premium' },
      { name: 'value', label: 'Valor mensal (R$)', type: 'number', required: true },
      { name: 'day', label: 'Dia do vencimento', type: 'number', required: true },
    ],
    confirmLabel: 'Salvar assinatura',
    onSubmit: ({ name, plan, value, day }) => {
      const monthlyValue = parseFloat(value);
      const dueDay = parseInt(day, 10);
      if (Number.isNaN(monthlyValue) || Number.isNaN(dueDay)) {
        showToast('Preencha valor e vencimento corretamente.', true);
        return false;
      }
      state.modules.subscriptions.push({ id: Date.now().toString(), name: name.trim(), plan: (plan || 'Plano Padrão').trim(), value: monthlyValue, day: dueDay });
      return true;
    },
    successMessage: 'Assinatura adicionada.',
  });
}

export function removeSubscription(id) {
  openConfirmDialog({
    title: 'Remover assinatura',
    message: 'Tem certeza que deseja remover esta assinatura?',
    confirmLabel: 'Remover',
    onConfirm: () => {
      state.modules.subscriptions = state.modules.subscriptions.filter((s) => s.id !== id);
      return true;
    },
    successMessage: 'Assinatura removida.',
  });
}

export function addStockItem() {
  openModuleForm({
    title: 'Novo item de estoque',
    fields: [
      { name: 'name', label: 'Nome do produto', placeholder: 'Ex: Papel higiênico', required: true },
      { name: 'category', label: 'Categoria', placeholder: 'Ex: Limpeza', required: true },
      { name: 'qty', label: 'Quantidade atual', type: 'number', required: true },
      { name: 'min', label: 'Quantidade mínima', type: 'number', required: true },
    ],
    confirmLabel: 'Adicionar item',
    onSubmit: ({ name, category, qty, min }) => {
      const currentQty = parseInt(qty, 10);
      const minimumQty = parseInt(min, 10);
      if (Number.isNaN(currentQty) || Number.isNaN(minimumQty)) {
        showToast('Quantidade e mínimo precisam ser números.', true);
        return false;
      }
      state.modules.stockItems.push({
        id: Date.now().toString(),
        name: name.trim(),
        category: category.trim(),
        qty: currentQty,
        min: minimumQty,
        price: 0,
        dueIn: 0,
      });
      return true;
    },
    successMessage: 'Item adicionado no estoque.',
  });
}

export function removeStockItem(id) {
  openConfirmDialog({
    title: 'Remover item',
    message: 'Tem certeza que deseja remover este item do estoque?',
    confirmLabel: 'Remover',
    onConfirm: () => {
      state.modules.stockItems = state.modules.stockItems.filter((s) => s.id !== id);
      return true;
    },
    successMessage: 'Item removido do estoque.',
  });
}

export function changeStockQty(id, delta) {
  const item = state.modules.stockItems.find(s => s.id === id);
  if (item) {
    if (item.qty + delta >= 0) {
      item.qty += delta;
      persist();
      renderModules();
    }
  }
}

export function addLimit() {
  openModuleForm({
    title: 'Novo limite por categoria',
    fields: [
      { name: 'category', label: 'Categoria', placeholder: 'Ex: Alimentação', required: true },
      { name: 'limit', label: 'Valor do limite (R$)', type: 'number', required: true },
    ],
    confirmLabel: 'Salvar limite',
    onSubmit: ({ category, limit }) => {
      const parsedLimit = parseFloat(limit);
      if (Number.isNaN(parsedLimit)) {
        showToast('Informe um valor numérico válido.', true);
        return false;
      }
      state.modules.limits.push({ id: Date.now().toString(), category: category.trim(), limit: parsedLimit });
      if (!state.modules.categories.find((c) => c.name === category.trim())) {
        state.modules.categories.push({ id: Date.now().toString(), name: category.trim(), type: 'expense' });
      }
      return true;
    },
    successMessage: 'Limite adicionado.',
  });
}

export function removeLimit(id) {
  openConfirmDialog({
    title: 'Remover limite',
    message: 'Deseja remover este limite de categoria?',
    confirmLabel: 'Remover',
    onConfirm: () => {
      state.modules.limits = state.modules.limits.filter((l) => l.id !== id);
      return true;
    },
    successMessage: 'Limite removido.',
  });
}

export function addBill() {
  openModuleForm({
    title: 'Nova conta a pagar',
    fields: [
      { name: 'name', label: 'Nome da conta', placeholder: 'Ex: Internet', required: true },
      { name: 'value', label: 'Valor (R$)', type: 'number', required: true },
      { name: 'day', label: 'Dia do vencimento', type: 'number', required: true },
    ],
    confirmLabel: 'Salvar conta',
    onSubmit: ({ name, value, day }) => {
      const parsedValue = parseFloat(value);
      const dueDay = parseInt(day, 10);
      if (Number.isNaN(parsedValue) || Number.isNaN(dueDay)) {
        showToast('Informe valor e vencimento válidos.', true);
        return false;
      }
      state.modules.bills.push({ id: Date.now().toString(), name: name.trim(), category: 'Despesa Fixa', value: parsedValue, day: dueDay, paid: false });
      return true;
    },
    successMessage: 'Conta adicionada.',
  });
}

export function removeBill(id) {
  openConfirmDialog({
    title: 'Remover conta',
    message: 'Deseja remover esta conta?',
    confirmLabel: 'Remover',
    onConfirm: () => {
      state.modules.bills = state.modules.bills.filter((b) => b.id !== id);
      return true;
    },
    successMessage: 'Conta removida.',
  });
}

function openModuleForm({ title, fields, onSubmit, confirmLabel = 'Salvar', successMessage = 'Salvo com sucesso.' }) {
  const modal = document.getElementById('genericFormModal');
  const titleEl = document.getElementById('gfmTitle');
  const body = document.getElementById('gfmBody');
  const confirm = document.getElementById('gfmConfirm');
  if (!modal || !titleEl || !body || !confirm) return;

  titleEl.textContent = title;
  body.innerHTML = fields.map((field) => `
    <div>
      <label class="gfm-label" for="gfm-${field.name}">${field.label}</label>
      <input
        class="finput"
        id="gfm-${field.name}"
        data-name="${field.name}"
        type="${field.type || 'text'}"
        placeholder="${field.placeholder || ''}"
        ${field.required ? 'required' : ''}
      />
    </div>
  `).join('');
  confirm.textContent = confirmLabel;

  confirm.onclick = () => {
    const values = {};
    for (const field of fields) {
      const input = body.querySelector(`[data-name="${field.name}"]`);
      values[field.name] = input?.value?.trim() || '';
      if (field.required && !values[field.name]) {
        showToast(`Preencha o campo "${field.label}".`, true);
        input?.focus();
        return;
      }
    }

    const saved = onSubmit(values);
    if (!saved) return;
    persist();
    renderModules();
    modal.style.display = 'none';
    showToast(successMessage);
  };

  modal.style.display = 'flex';
}

function openConfirmDialog({ title, message, confirmLabel = 'Confirmar', onConfirm, successMessage = 'Concluído.' }) {
  const modal = document.getElementById('genericFormModal');
  const titleEl = document.getElementById('gfmTitle');
  const body = document.getElementById('gfmBody');
  const confirm = document.getElementById('gfmConfirm');
  if (!modal || !titleEl || !body || !confirm) return;

  titleEl.textContent = title;
  body.innerHTML = `<p class="gfm-message">${message}</p>`;
  confirm.textContent = confirmLabel;
  confirm.onclick = () => {
    const removed = onConfirm();
    if (!removed) return;
    persist();
    renderModules();
    modal.style.display = 'none';
    showToast(successMessage);
  };

  modal.style.display = 'flex';
}
