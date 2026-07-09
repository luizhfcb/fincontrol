import { state } from '../core/state.js';
import { buildModuleTransactionDocId, getDueSubscriptionPosts } from '../core/subscription-sync.mjs';
import { formatCurrency, getMonthlyTransactions } from '../core/utils.js';
import { showToast } from './feedback.js';
import { db, deleteDoc, doc, getDoc, onSnapshot, setDoc, updateDoc } from '../config/firebase.js';
import { DEFAULT_CATEGORIES } from '../core/constants.js';
import {
  renderDesktopBillsModule,
  renderDesktopLimitsModule,
  renderDesktopStockModule,
  renderDesktopSubscriptionsModule,
} from './desktop-module-templates.mjs';
import {
  renderMobileBillsModule,
  renderMobileLimitsModule,
  renderMobileStockModule,
  renderMobileSubscriptionsModule,
} from './mobile-module-templates.mjs';
import { escapeHtml } from './render.js';
import { maybeStartOnboarding } from './onboarding.js';

const STORAGE_KEY_BASE = 'fincontrol_modules_v1';
/** Key de cache local scoped por usuário — evita vazamento de dados entre contas no mesmo device. */
function storageKey() {
  return state.currentUser ? `${STORAGE_KEY_BASE}_${state.currentUser.uid}` : STORAGE_KEY_BASE;
}
const MODULES_DOC_TYPE = 'modules_state';
const MODULES_COLLECTION = 'modules';
// Endereço antigo: doc `${uid}_modules` dentro de `transactions` (pré-migração)
const LEGACY_MODULES_COLLECTION = 'transactions';
// Evita tentar migrar mais de 1x por uid na mesma sessão (onSnapshot pode re-disparar)
const migrationAttempted = new Set();

function legacyModulesRef(uid) {
  return doc(db, LEGACY_MODULES_COLLECTION, `${uid}_modules`);
}

/**
 * Migra o doc de módulos do endereço antigo (transactions/{uid}_modules)
 * para o novo (modules/{uid}). Só apaga o antigo após gravar o novo com
 * sucesso. Retorna true se havia doc legado e ele foi copiado.
 */
async function migrateLegacyModulesDoc(uid) {
  const legacySnap = await getDoc(legacyModulesRef(uid));
  if (!legacySnap.exists()) return false;

  await setDoc(doc(db, MODULES_COLLECTION, uid), legacySnap.data());
  await deleteDoc(legacyModulesRef(uid));
  return true;
}

/** Doc novo já existe mas o legado sobreviveu (migração interrompida): limpa. */
async function cleanupLegacyModulesDoc(uid) {
  try {
    const legacySnap = await getDoc(legacyModulesRef(uid));
    if (legacySnap.exists()) await deleteDoc(legacyModulesRef(uid));
  } catch (error) {
    // best-effort: doc legado órfão não afeta o app, só ocupa espaço
    console.warn('[Migração] Não foi possível remover doc legado de módulos:', error);
  }
}
const pendingModuleRefs = new Set();

const defaultData = {
  categories: [],
  limits: [],
  subscriptions: [],
  stockItems: [],
  bills: [],
  onboarding: {},
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

  const uid = state.currentUser.uid;
  const docRef = doc(db, MODULES_COLLECTION, uid);
  state.unsubscribeModules = onSnapshot(docRef, async (snapshot) => {
    if (!snapshot.exists()) {
      // Antes de tratar como usuário novo: pode ser conta antiga com doc no
      // endereço legado. Migra 1x; o setDoc da migração re-dispara o listener.
      if (!migrationAttempted.has(uid)) {
        migrationAttempted.add(uid);
        try {
          const migrated = await migrateLegacyModulesDoc(uid);
          if (migrated) return;
        } catch (error) {
          console.error('[Migração] Falha ao migrar módulos do endereço legado:', error);
          // NÃO semeia defaults por cima: dados legados ainda existem.
          // Libera nova tentativa e segura no cache local até resolver.
          migrationAttempted.delete(uid);
          state.modules = loadData();
          renderModules();
          showToast('Erro ao sincronizar módulos. Nova tentativa no próximo acesso.', true);
          return;
        }
      }

      // Usuário novo começa do zero — nunca herda cache local de outra conta.
      state.modules = cloneDefaults();
      state.modules.categories = DEFAULT_CATEGORIES.map((c) => ({ ...c }));
      await setDoc(docRef, {
        uid,
        _docType: MODULES_DOC_TYPE,
        ...state.modules,
      });
      state.modulesDocId = uid;
      persistLocal();
      renderModules();
      return;
    }
    // Migração pode ter deixado o doc legado pra trás (interrupção): limpeza 1x.
    if (!migrationAttempted.has(uid)) {
      migrationAttempted.add(uid);
      cleanupLegacyModulesDoc(uid);
    }
    state.modulesDocId = snapshot.id;
    state.modules = { ...cloneDefaults(), ...snapshot.data() };
    // Conta existente sem categorias: semeia defaults e persiste pra página e modal baterem.
    if (!state.modules.categories || state.modules.categories.length === 0) {
      state.modules.categories = DEFAULT_CATEGORIES.map((c) => ({ ...c }));
      await setDoc(docRef, {
        uid: state.currentUser.uid,
        _docType: MODULES_DOC_TYPE,
        ...state.modules,
      });
    }
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
    const raw = localStorage.getItem(storageKey());
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
  localStorage.setItem(storageKey(), JSON.stringify(state.modules));
}

async function persist() {
  persistLocal();
  if (!state.currentUser) return;
  const modulesDocId = state.currentUser.uid;
  try {
    await setDoc(doc(db, MODULES_COLLECTION, modulesDocId), {
      uid: state.currentUser.uid,
      _docType: MODULES_DOC_TYPE,
      ...state.modules,
    });
    state.modulesDocId = modulesDocId;
  } catch (error) {
    console.error('[Firestore] Erro ao salvar módulos:', error);
    showToast('Erro ao salvar módulos na nuvem.', true);
  }
}

/** Exportado para uso em categories.js (criação inline de categoria) */
export const persistModules = persist;

export function renderModules() {
  if (!state.modules) return;
  maybeStartOnboarding();
  processDueSubscriptions();
  renderLimits();
  renderSubscriptions();
  renderStock();
  renderBills();
  renderMobileModules();
}

function expensesByCategory() {
  const monthlyExpenses = getMonthlyTransactions().filter((t) => t.type === 'expense');

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
      return `<div class="limit-row" style="margin-bottom:8px; border:none; padding:4px 0;"><div><strong style="font-size:13px">${escapeHtml(item.category)}</strong><small style="font-size:10px">${pct}% usado</small></div><div class="progress"><i style="width:${pct}%"></i></div></div>`;
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
        <div class="chip-wrap">${state.modules.categories.map((c) => `<span class="chip">${escapeHtml(c.name)} <small>${escapeHtml(c.type)}</small></span>`).join('')}</div>
      </div>
      <div class="module-card">
        <h3>🎯 Limites por categoria</h3>
        <div class="list-wrap">
          ${limits.map((item) => {
            const spent = spentMap[item.category] || 0;
            const pct = Math.min(100, Math.round((spent / item.limit) * 100));
            return `<div class="limit-row"><div><strong>${escapeHtml(item.category)}</strong><small>Gasto: ${formatCurrency(spent)} / ${formatCurrency(item.limit)}</small></div><div style="display:flex; align-items:center; gap:12px;"><span>${pct}%</span><button onclick="editLimit('${item.id}')" style="background:transparent; border:none; color:var(--text3); cursor:pointer">✏️</button><button onclick="removeLimit('${item.id}')" style="background:transparent; border:none; color:var(--text3); cursor:pointer">🗑</button></div><div class="progress"><i style="width:${pct}%"></i></div></div>`;
          }).join('')}
        </div>
      </div>
      <div class="module-card">
        <h3>📊 Resumo de limites</h3>
        <div class="notice ok">• ${within} categorias dentro do limite</div>
        <div class="notice warn">• ${high} categorias acima de 70%</div>
      </div>
    </div>`;

  el.innerHTML = renderDesktopLimitsModule({
    categories: state.modules.categories,
    limits: limits.map((item) => {
      const spent = spentMap[item.category] || 0;
      const pct = Math.min(100, Math.round((spent / item.limit) * 100));
      return { ...item, spent, pct };
    }),
    within,
    high,
  });

  // Botão para adicionar categoria personalizada
  const catSection = el.querySelector('.chip-wrap')?.closest('.module-card');
  if (catSection) {
    const addCatBtn = document.createElement('button');
    addCatBtn.className = 'list-btn';
    addCatBtn.style.marginTop = '12px';
    addCatBtn.textContent = '+ Nova Categoria';
    addCatBtn.onclick = () => addCategory();
    catSection.appendChild(addCatBtn);

    // Tornar chips de categoria clicáveis para remoção
    catSection.querySelectorAll('.chip').forEach((chip) => {
      const id = chip.dataset.id;
      if (id) {
        const delBtn = document.createElement('button');
        delBtn.innerHTML = ' ✕';
        delBtn.style.cssText = 'background:transparent;border:none;cursor:pointer;color:var(--text3);font-size:11px;padding:0 0 0 4px;';
        delBtn.onclick = (e) => { e.stopPropagation(); removeCategory(id); };
        chip.appendChild(delBtn);
      }
    });
  }
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
      ${state.modules.subscriptions.map((s) => `<div class="sub-row"><div><strong>${escapeHtml(s.name)}</strong><small>${escapeHtml(s.plan)}</small></div><div style="text-align:right"><strong>${formatCurrency(s.value)}/mês</strong><small>Desconto dia ${s.day} <button onclick="editSubscription('${s.id}')" style="background:transparent; border:none; color:var(--text3); cursor:pointer; margin-left:6px">✏️</button><button onclick="removeSubscription('${s.id}')" style="background:transparent; border:none; color:var(--text3); cursor:pointer; margin-left:6px">🗑</button></small></div></div>`).join('')}
    </div>
  </div>`;

  el.innerHTML = renderDesktopSubscriptionsModule({
    subscriptions: state.modules.subscriptions,
    totalMonth,
  });
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
    <div class="module-card"><h3>🚨 Alertas de reposição</h3><div class="list-wrap">${alerts.map((a) => `<div class="notice ${a.qty === 0 ? 'danger' : 'warn'}">${escapeHtml(a.name)} — estoque ${a.qty === 0 ? 'zerado' : 'baixo'}</div>`).join('') || '<div class="notice ok">Sem alertas no momento</div>'}</div></div>
    <div class="module-card"><h3>📅 Próximas reposições</h3><div class="list-wrap">${state.modules.stockItems.map((i) => `<div class="sub-row"><div><strong>${escapeHtml(i.name)}</strong><small>${i.dueIn < 0 ? 'Vencido' : `Em ${i.dueIn} dias`}</small></div><strong>${formatCurrency(i.price)}</strong></div>`).join('')}</div></div>
  </div>
  <div class="module-card"><h3>📦 Itens do estoque</h3><div class="stock-grid">${state.modules.stockItems.map((i) => `<div class="stock-item"><div style="display:flex; justify-content:space-between"><strong>${escapeHtml(i.name)}</strong> <button onclick="removeStockItem('${i.id}')" style="background:transparent; border:none; color:var(--text3); cursor:pointer">🗑</button></div><small>${escapeHtml(i.category)}</small><div class="progress"><i style="width:${Math.min(100, (i.qty / Math.max(1, i.min)) * 100)}%"></i></div><div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px"><p style="margin:0">${i.qty} un. (mín ${i.min})</p><div><button onclick="changeStockQty('${i.id}', -1)" style="padding:2px 6px; border-radius:4px">-</button> <button onclick="changeStockQty('${i.id}', 1)" style="padding:2px 6px; border-radius:4px">+</button></div></div></div>`).join('')}</div></div>`;

  el.innerHTML = renderDesktopStockModule({
    stockItems: state.modules.stockItems,
    alerts,
  });
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
    <tbody>${state.modules.bills.map((b) => `<tr><td>${escapeHtml(b.name)}</td><td>${escapeHtml(b.category)}</td><td>Dia ${b.day}</td><td>${formatCurrency(b.value)}</td><td><input type="checkbox" ${b.paid ? 'checked' : ''} onchange="toggleBillPaid('${b.id}', this.checked)"></td><td><button onclick="editBill('${b.id}')" style="background:transparent; border:none; color:var(--text3); cursor:pointer">✏️</button><button onclick="removeBill('${b.id}')" style="background:transparent; border:none; color:var(--text3); cursor:pointer">🗑</button></td></tr>`).join('')}</tbody></table>
  </div>`;

  el.innerHTML = renderDesktopBillsModule({
    bills: state.modules.bills,
    total,
    paid,
  });
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
        return `<div class="limit-row"><div><strong>${escapeHtml(item.category)}</strong><small>${formatCurrency(spent)} de ${formatCurrency(item.limit)}</small></div><div style="display:flex;align-items:center;gap:8px"><span>${pct}%</span><button onclick="editLimit('${item.id}')" class="mini-action">✏️</button><button onclick="removeLimit('${item.id}')" class="mini-action">🗑</button></div><div class="progress"><i style="width:${pct}%"></i></div></div>`;
      }).join('') || '<div class="empty">Nenhum limite configurado</div>'}
    </div>`;

  subscriptionsEl.innerHTML = `
    <button class="list-btn" style="margin-bottom:10px" onclick="addSubscription()">+ Nova assinatura</button>
    <div class="notice ok" style="margin-bottom:10px">${state.modules.subscriptions.length} assinatura(s) · ${formatCurrency(totalMonth)}/mês</div>
    <div class="list-wrap">
      ${state.modules.subscriptions.map((s) => `<div class="sub-row"><div><strong>${escapeHtml(s.name)}</strong><small>${escapeHtml(s.plan)}</small></div><div style="text-align:right"><strong>${formatCurrency(s.value)}</strong><small>Dia ${s.day} <button onclick="editSubscription('${s.id}')" class="mini-action">✏️</button><button onclick="removeSubscription('${s.id}')" class="mini-action">🗑</button></small></div></div>`).join('') || '<div class="empty">Nenhuma assinatura</div>'}
    </div>`;

  billsEl.innerHTML = `
    <button class="list-btn" style="margin-bottom:10px" onclick="addBill()">+ Nova conta</button>
    <div class="notice warn" style="margin-bottom:10px">Pago ${formatCurrency(paidBills)} de ${formatCurrency(totalBills)}</div>
    <div class="list-wrap">
      ${state.modules.bills.map((b) => `<div class="sub-row"><div><strong>${escapeHtml(b.name)}</strong><small>Vence dia ${b.day}</small></div><div style="display:flex;align-items:center;gap:8px"><input type="checkbox" ${b.paid ? 'checked' : ''} onchange="toggleBillPaid('${b.id}', this.checked)"><button onclick="editBill('${b.id}')" class="mini-action">✏️</button><button onclick="removeBill('${b.id}')" class="mini-action">🗑</button></div></div>`).join('') || '<div class="empty">Sem contas cadastradas</div>'}
    </div>`;

  stockEl.innerHTML = `
    <button class="list-btn" style="margin-bottom:10px" onclick="addStockItem()">+ Novo item</button>
    <div class="notice ${alerts ? 'warn' : 'ok'}" style="margin-bottom:10px">${alerts} alerta(s) em ${state.modules.stockItems.length} item(ns)</div>
    <div class="list-wrap">
      ${state.modules.stockItems.map((i) => `<div class="sub-row"><div><strong>${escapeHtml(i.name)}</strong><small>${i.qty} un. (mín ${i.min})</small></div><div style="display:flex;align-items:center;gap:6px"><button onclick="changeStockQty('${i.id}', -1)" class="mini-action">-</button><button onclick="changeStockQty('${i.id}', 1)" class="mini-action">+</button><button onclick="removeStockItem('${i.id}')" class="mini-action">🗑</button></div></div>`).join('') || '<div class="empty">Sem itens no estoque</div>'}
    </div>`;

  limitsEl.innerHTML = renderMobileLimitsModule({
    categories: state.modules.categories,
    limits: state.modules.limits.map((item) => {
      const spent = spentMap[item.category] || 0;
      const pct = Math.min(100, Math.round((spent / item.limit) * 100));
      return { ...item, spent, pct };
    }),
  });

  subscriptionsEl.innerHTML = renderMobileSubscriptionsModule({
    subscriptions: state.modules.subscriptions,
    totalMonth,
  });

  billsEl.innerHTML = renderMobileBillsModule({
    bills: state.modules.bills,
    totalBills,
    paidBills,
  });

  stockEl.innerHTML = renderMobileStockModule({
    stockItems: state.modules.stockItems,
    alerts,
  });
}

export async function toggleBillPaid(id, paid) {
  const bill = state.modules.bills.find((b) => b.id === id);
  if (!bill) return;
  bill.paid = paid;
  try {
    if (paid) {
      await postBillExpense(bill);
    } else {
      await removeBillExpense(bill);
    }
  } catch (error) {
    showToast('Erro ao sincronizar pagamento com gastos.', true);
    console.error(error);
  }
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

export function editSubscription(id) {
  const item = state.modules.subscriptions.find((s) => s.id === id);
  if (!item) return;
  openModuleForm({
    title: 'Editar assinatura',
    fields: [
      { name: 'name', label: 'Nome da assinatura', required: true },
      { name: 'plan', label: 'Plano' },
      { name: 'value', label: 'Valor mensal (R$)', type: 'number', required: true },
      { name: 'day', label: 'Dia do vencimento', type: 'number', required: true },
    ],
    initialValues: item,
    confirmLabel: 'Salvar alterações',
    onSubmit: ({ name, plan, value, day }) => {
      const monthlyValue = parseFloat(value);
      const dueDay = parseInt(day, 10);
      if (Number.isNaN(monthlyValue) || Number.isNaN(dueDay)) return false;
      item.name = name.trim();
      item.plan = (plan || 'Plano Padrão').trim();
      item.value = monthlyValue;
      item.day = dueDay;
      return true;
    },
    successMessage: 'Assinatura atualizada.',
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

// ─── Gerenciamento de Categorias Dinâmicas ─────────────────────────────────

export function addCategory() {
  openModuleForm({
    title: 'Nova categoria',
    fields: [
      { name: 'name', label: 'Nome da categoria', placeholder: 'Ex: Alimentação, Transporte, Lazer…', required: true },
      { name: 'type', label: 'Tipo (income = receita / expense = despesa)', placeholder: 'expense' },
    ],
    confirmLabel: 'Criar categoria',
    onSubmit: ({ name, type }) => {
      const normalizedType = (type || 'expense').toLowerCase().includes('inc') ? 'income' : 'expense';
      const trimmed = name.trim();
      if (!trimmed) {
        showToast('Informe o nome da categoria.', true);
        return false;
      }
      if (state.modules.categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
        showToast('Categoria já existe.', true);
        return false;
      }
      state.modules.categories.push({ id: Date.now().toString(), name: trimmed, type: normalizedType });
      return true;
    },
    successMessage: 'Categoria criada com sucesso.',
  });
}

export function removeCategory(id) {
  const item = state.modules.categories.find((c) => c.id === id);
  if (!item) return;

  openCategoryDeleteDialog(item);
}

export function editCategory(id) {
  const item = state.modules.categories.find((c) => c.id === id);
  if (!item) return;

  const modal = document.getElementById('genericFormModal');
  const titleEl = document.getElementById('gfmTitle');
  const body = document.getElementById('gfmBody');
  const confirm = document.getElementById('gfmConfirm');
  if (!modal || !titleEl || !body || !confirm) return;

  titleEl.textContent = 'Editar categoria';
  body.innerHTML = `
    <div>
      <label class="gfm-label" for="categoryEditName">Nome da categoria</label>
      <input class="finput" id="categoryEditName" type="text" value="${escapeHtml(item.name)}" maxlength="32" />
    </div>
    <div>
      <label class="gfm-label" for="categoryEditType">Tipo</label>
      <select class="finput" id="categoryEditType">
        <option value="expense" ${item.type !== 'income' ? 'selected' : ''}>Despesa</option>
        <option value="income" ${item.type === 'income' ? 'selected' : ''}>Receita</option>
      </select>
    </div>
    <label class="category-option-row">
      <input id="categoryEditApplyOld" type="checkbox" />
      <span>Atualizar transações antigas desta categoria também</span>
    </label>
  `;
  confirm.textContent = 'Salvar';
  confirm.onclick = async () => {
    const input = document.getElementById('categoryEditName');
    const typeInput = document.getElementById('categoryEditType');
    const applyOldInput = document.getElementById('categoryEditApplyOld');
    const nextName = input?.value?.trim();
    const nextType = typeInput?.value === 'income' ? 'income' : 'expense';
    const previousName = item.name;

    if (!nextName) {
      showToast('Informe o nome da categoria.', true);
      input?.focus();
      return;
    }

    const duplicated = state.modules.categories.some(
      (category) => category.id !== id && category.name.toLowerCase() === nextName.toLowerCase(),
    );
    if (duplicated) {
      showToast('Categoria já existe.', true);
      input?.focus();
      return;
    }

    item.name = nextName;
    item.type = nextType;
    if (state.selectedCategory === previousName) state.selectedCategory = nextName;

    if (applyOldInput?.checked && previousName !== nextName) {
      await updateTransactionsCategory(previousName, nextName);
    }

    persist();
    renderModules();
    modal.style.display = 'none';
    showToast('Categoria atualizada.');
  };

  modal.style.display = 'flex';
  document.getElementById('categoryEditName')?.focus();
}

function openCategoryDeleteDialog(item) {
  openConfirmDialog({
    title: 'Remover categoria',
    message: `
      Deseja remover a categoria "${escapeHtml(item.name)}"?
      <label class="category-option-row">
        <input id="categoryDeleteMoveOld" type="checkbox" />
        <span>Mover transações antigas desta categoria para "Outros"</span>
      </label>
    `,
    confirmLabel: 'Remover',
    onConfirm: async () => {
      const moveOld = document.getElementById('categoryDeleteMoveOld')?.checked;
      state.modules.categories = state.modules.categories.filter((c) => c.id !== item.id);
      if (state.selectedCategory === item.name) {
        state.selectedCategory = state.modules.categories[0]?.name || 'Outros';
      }
      if (moveOld) {
        await updateTransactionsCategory(item.name, 'Outros');
      }
      return true;
    },
    successMessage: 'Categoria removida.',
  });
}

async function updateTransactionsCategory(fromCategory, toCategory) {
  if (!state.currentUser) return;

  const matchingTransactions = state.transactions.filter((transaction) => transaction.cat === fromCategory);
  if (!matchingTransactions.length) return;

  try {
    await Promise.all(matchingTransactions.map((transaction) => (
      updateDoc(doc(db, 'transactions', transaction.id), { cat: toCategory })
    )));
    state.transactions = state.transactions.map((transaction) => (
      transaction.cat === fromCategory ? { ...transaction, cat: toCategory } : transaction
    ));
  } catch (error) {
    console.error('[Firestore] Erro ao atualizar transações antigas:', error);
    showToast('Erro ao atualizar transações antigas.', true);
  }
}

export function editLimit(id) {
  const item = state.modules.limits.find((l) => l.id === id);
  if (!item) return;
  openModuleForm({
    title: 'Editar limite',
    fields: [
      { name: 'category', label: 'Categoria', required: true },
      { name: 'limit', label: 'Valor do limite (R$)', type: 'number', required: true },
    ],
    initialValues: item,
    confirmLabel: 'Salvar alterações',
    onSubmit: ({ category, limit }) => {
      const parsedLimit = parseFloat(limit);
      if (Number.isNaN(parsedLimit)) return false;
      item.category = category.trim();
      item.limit = parsedLimit;
      return true;
    },
    successMessage: 'Limite atualizado.',
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

export function editBill(id) {
  const item = state.modules.bills.find((b) => b.id === id);
  if (!item) return;
  openModuleForm({
    title: 'Editar conta',
    fields: [
      { name: 'name', label: 'Nome da conta', required: true },
      { name: 'value', label: 'Valor (R$)', type: 'number', required: true },
      { name: 'day', label: 'Dia do vencimento', type: 'number', required: true },
    ],
    initialValues: item,
    confirmLabel: 'Salvar alterações',
    onSubmit: ({ name, value, day }) => {
      const parsedValue = parseFloat(value);
      const dueDay = parseInt(day, 10);
      if (Number.isNaN(parsedValue) || Number.isNaN(dueDay)) return false;
      item.name = name.trim();
      item.value = parsedValue;
      item.day = dueDay;
      return true;
    },
    successMessage: 'Conta atualizada.',
  });
}

function openModuleForm({ title, fields, onSubmit, confirmLabel = 'Salvar', successMessage = 'Salvo com sucesso.', initialValues = {} }) {
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

  fields.forEach((field) => {
    const input = body.querySelector(`[data-name="${field.name}"]`);
    if (input && initialValues[field.name] !== undefined) {
      input.value = initialValues[field.name];
    }
  });

  modal.style.display = 'flex';
}

function openConfirmDialog({ title, message, confirmLabel = 'Confirmar', onConfirm, successMessage = 'Concluído.' }) {
  const modal = document.getElementById('genericFormModal');
  const titleEl = document.getElementById('gfmTitle');
  const body = document.getElementById('gfmBody');
  const confirm = document.getElementById('gfmConfirm');
  if (!modal || !titleEl || !body || !confirm) return;

  titleEl.textContent = title;
  body.innerHTML = `<div class="gfm-message">${message}</div>`;
  confirm.textContent = confirmLabel;
  confirm.onclick = async () => {
    const removed = await onConfirm();
    if (!removed) return;
    persist();
    renderModules();
    modal.style.display = 'none';
    showToast(successMessage);
  };

  modal.style.display = 'flex';
}

function getPeriodKey(year = state.currentYear, month = state.currentMonth) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function alreadyPosted(ref) {
  return state.transactions.some((t) => t.moduleRef === ref);
}

async function postModuleExpense({ ref, desc, value, category }) {
  if (!state.currentUser || alreadyPosted(ref) || pendingModuleRefs.has(ref)) return;
  pendingModuleRefs.add(ref);
  try {
    const transactionDocId = buildModuleTransactionDocId(state.currentUser.uid, ref);
    const payload = {
      uid: state.currentUser.uid,
      desc,
      val: value,
      type: 'expense',
      cat: category || 'Outros',
      date: new Date().toISOString(),
      month: state.currentMonth,
      year: state.currentYear,
      moduleRef: ref,
    };
    await setDoc(doc(db, 'transactions', transactionDocId), payload);
    state.transactions = [
      ...state.transactions.filter((transaction) => transaction.id !== transactionDocId),
      { id: transactionDocId, ...payload },
    ];
  } catch (error) {
    showToast('Não foi possível lançar gasto automático.', true);
    console.error(error);
  } finally {
    pendingModuleRefs.delete(ref);
  }
}

async function removeModuleExpense(ref) {
  if (!state.currentUser) return;
  const transactionDocId = buildModuleTransactionDocId(state.currentUser.uid, ref);
  await deleteDoc(doc(db, 'transactions', transactionDocId));
}

function processDueSubscriptions() {
  const duePosts = getDueSubscriptionPosts({
    subscriptions: state.modules.subscriptions,
    now: new Date(),
    viewedMonth: state.currentMonth,
    viewedYear: state.currentYear,
    transactionsLoaded: state.transactionsLoaded,
    existingRefs: new Set(state.transactions.map((transaction) => transaction.moduleRef).filter(Boolean)),
    pendingRefs: pendingModuleRefs,
  });

  duePosts.forEach(({ subscription, ref }) => {
    postModuleExpense({
      ref,
      desc: `Assinatura: ${subscription.name}`,
      value: subscription.value,
      category: 'Assinaturas',
    });
  });
}

function postBillExpense(bill) {
  const ref = `bill:${bill.id}:${getPeriodKey()}`;
  return postModuleExpense({
    ref,
    desc: `Conta paga: ${bill.name}`,
    value: bill.value,
    category: bill.category || 'Despesa Fixa',
  });
}

function removeBillExpense(bill) {
  const ref = `bill:${bill.id}:${getPeriodKey()}`;
  return removeModuleExpense(ref);
}
