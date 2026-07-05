import { CATEGORY_COLORS, CATEGORY_ICONS, MONTHS } from '../core/constants.js';
import { state } from '../core/state.js';
import { formatCompactCurrency, formatCurrency, setText } from '../core/utils.js';
import { renderModules } from './modules.js';

// ─── Paleta de cores para receitas ───────────────────────────────────────────
const INCOME_PALETTE = [
  '#22c55e', '#16a34a', '#15803d', '#14532d',
  '#4ade80', '#86efac', '#34d399', '#059669',
];

// ─── SVGs das visões do dashboard ────────────────────────────────────
const DVP_ICONS = {
  all:     '<svg class="dvp-svg" viewBox="0 0 24 24"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>',
  income:  '<svg class="dvp-svg" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
  expense: '<svg class="dvp-svg" viewBox="0 0 24 24"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>',
};

// ─── Configurações das visões do dashboard ────────────────────────────────────
const DASH_VIEWS = [
  { key: 'all',     label: 'Visão Geral' },
  { key: 'income',  label: 'Receitas'    },
  { key: 'expense', label: 'Despesas'    },
];

// ─── Ícones SVG para transações ──────────────────────────────────────────────────

/** Seta SVG para transação individual (income=verde/cima, expense=vermelho/baixo) */
function txTypeIcon(type) {
  if (type === 'income') {
    return '<svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>';
  }
  return '<svg viewBox="0 0 24 24"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>';
}

/** Ícone de tag SVG para cabeçalho de grupo de categoria */
function catGroupIcon() {
  return '<svg viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>';
}

export function refreshUI() {
  const monthlyTransactions = state.transactions.filter(
    (t) => t.month === state.currentMonth && t.year === state.currentYear,
  );

  const incomeTransactions  = monthlyTransactions.filter((t) => t.type === 'income');
  const expenseTransactions = monthlyTransactions.filter((t) => t.type === 'expense');
  const income  = incomeTransactions.reduce((s, t)  => s + t.val, 0);
  const expense = expenseTransactions.reduce((s, t) => s + t.val, 0);
  const balance = income - expense;

  const stockAlerts  = (state.stock || []).filter((i) => i.qty <= (i.min || 0)).length;
  const activeDays   = new Set(monthlyTransactions.map((t) => new Date(t.date).toDateString()));
  const dailyAverage = activeDays.size ? expense / activeDays.size : 0;
  const highestExpense = [...expenseTransactions].sort((a, b) => b.val - a.val)[0];

  const prevDate = new Date(state.currentYear, state.currentMonth - 1, 1);
  const prevTxs  = state.transactions.filter(
    (t) => t.month === prevDate.getMonth() && t.year === prevDate.getFullYear(),
  );
  const prevIncome  = prevTxs.filter((t) => t.type === 'income').reduce((s, t)  => s + t.val, 0);
  const prevExpense = prevTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.val, 0);
  const prevBalance = prevIncome - prevExpense;
  const balanceDelta = prevBalance === 0
    ? 0
    : Math.round(((balance - prevBalance) / Math.abs(prevBalance)) * 100);

  // ── Lógica de visão (Geral / Receitas / Despesas) ─────────────────────────
  const dashView = state.dashView || 'all';
  let heroValue, heroClass, balanceLabel, chartTxs, chartTotal, chartIsIncome;

  if (dashView === 'income') {
    heroValue    = income;
    heroClass    = 'positive';
    balanceLabel = 'TOTAL RECEITAS';
    chartTxs     = incomeTransactions;
    chartTotal   = income;
    chartIsIncome = true;
  } else if (dashView === 'expense') {
    heroValue    = expense;
    heroClass    = 'negative';
    balanceLabel = 'TOTAL DESPESAS';
    chartTxs     = expenseTransactions;
    chartTotal   = expense;
    chartIsIncome = false;
  } else {
    heroValue    = Math.abs(balance);
    heroClass    = balance >= 0 ? 'positive' : 'negative';
    balanceLabel = 'SALDO TOTAL';
    chartTxs     = expenseTransactions;
    chartTotal   = expense;
    chartIsIncome = false;
  }

  // ── Atualiza métrica principal ─────────────────────────────────────────────
  ['mBalance', 'dBalance'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = formatCurrency(heroValue);
    el.className   = `big-val ${heroClass}`;
  });
  const mobileBalanceCard = document.getElementById('mBalanceCard');
  if (mobileBalanceCard) {
    mobileBalanceCard.textContent = formatCurrency(heroValue);
    mobileBalanceCard.className = heroClass;
  }
  setText('mBalanceLabel', balanceLabel);
  setText('dBalanceLabel', balanceLabel);

  // ── Métricas secundárias ───────────────────────────────────────────────────
  setText('mIncome', formatCurrency(income));
  setText('dIncome', formatCurrency(income));
  setText('mExpense', formatCurrency(expense));
  setText('dExpense', formatCurrency(expense));
  setText('mStockAlerts', stockAlerts);
  setText('dStockAlerts', stockAlerts);
  setText('mDays',  activeDays.size);  setText('mDays2',  activeDays.size);
  setText('dDays',  activeDays.size);  setText('dDays2',  activeDays.size);
  setText('mAvg',   formatCompactCurrency(dailyAverage));
  setText('mAvg2',  formatCompactCurrency(dailyAverage));
  setText('dAvg',   formatCompactCurrency(dailyAverage));
  setText('dAvg2',  formatCompactCurrency(dailyAverage));
  setText('mCount', monthlyTransactions.length);
  setText('mCount2', monthlyTransactions.length);
  setText('dCount', monthlyTransactions.length);
  setText('dCount2', monthlyTransactions.length);
  setText('mBig',    highestExpense ? formatCompactCurrency(highestExpense.val) : '—');
  setText('mBig2',   highestExpense ? formatCompactCurrency(highestExpense.val) : '—');
  setText('mBigSub', highestExpense ? highestExpense.desc : '—');
  setText('dBig',    highestExpense ? formatCurrency(highestExpense.val) : '—');
  setText('dBig2',   highestExpense ? formatCurrency(highestExpense.val) : '—');
  setText('dBigSub', highestExpense ? `${highestExpense.cat} — ${highestExpense.desc}` : '—');
  setText('mMonthSync', `${MONTHS[state.currentMonth]} ${state.currentYear} • Sincronizado`);
  setText('mPeriodLabel', getMonthPeriodLabel(state.currentYear, state.currentMonth));

  const badge = document.getElementById('mBalanceDelta');
  if (badge) {
    badge.textContent = `${balanceDelta >= 0 ? '+' : ''}${balanceDelta}%`;
    badge.className   = `m-badge ${balanceDelta >= 0 ? 'positive' : 'negative'}`;
  }

  // ── Seletor de visão (dropdown pill) ──────────────────────────────────────
  renderDashViewSelector('mDashViewWrap');
  renderDashViewSelector('dDashViewWrap');

  // ── Gráfico adaptativo ─────────────────────────────────────────────────────
  const catMap = {};
  chartTxs.forEach((t) => { catMap[t.cat || 'Outros'] = (catMap[t.cat || 'Outros'] || 0) + t.val; });
  const sortedCategories = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

  renderMobileSpotlight('mTxList', highestExpense, expense);
  renderTransactionsPage(monthlyTransactions);
  renderDonutCharts(sortedCategories, chartTotal, chartIsIncome);
  renderSixMonthChart('mSixMonthChart', state.transactions);
  renderSixMonthChart('dSixMonthChart', state.transactions);
  renderModules();
}

// ─── Seletor de Visão do Dashboard ───────────────────────────────────────────

function renderDashViewSelector(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const v      = state.dashView || 'all';
  const current = DASH_VIEWS.find((o) => o.key === v) || DASH_VIEWS[0];
  const dropId  = `${containerId}-drop`;

  container.innerHTML = `
    <div class="dash-view-selector">
      <button
        class="dash-view-pill${v === 'income' ? ' income' : v === 'expense' ? ' expense' : ''}"
        onclick="toggleDashViewDropdown('${dropId}')"
        aria-haspopup="listbox"
        aria-expanded="false"
        id="${containerId}-pill"
      >
        ${DVP_ICONS[v]}
        <span class="dvp-label">${current.label}</span>
        <svg class="dvp-arrow" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      <div class="dash-view-dropdown" id="${dropId}" role="listbox">
        ${DASH_VIEWS.map((o) => `
          <button
            class="dv-option${o.key === v ? ' active' : ''}"
            role="option"
            onclick="setDashView('${o.key}')"
          >
            <span class="dv-opt-icon">${DVP_ICONS[o.key]}</span>
            <span>${o.label}</span>
            ${o.key === v ? '<span class="dv-check">&#10003;</span>' : ''}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

export function setDashView(view) {
  state.dashView = view;
  // Fecha dropdowns abertos
  document.querySelectorAll('.dash-view-dropdown.open').forEach((d) => d.classList.remove('open'));
  refreshUI();
}

export function toggleDashViewDropdown(dropId) {
  const drop = document.getElementById(dropId);
  if (!drop) return;
  // Fecha os outros
  document.querySelectorAll('.dash-view-dropdown').forEach((d) => {
    if (d !== drop) d.classList.remove('open');
  });
  const isOpen = drop.classList.toggle('open');
  // Rotaciona a seta
  const pill = drop.previousElementSibling;
  if (pill) pill.setAttribute('aria-expanded', String(isOpen));
}

// ─── Aba Dedicada de Transações ───────────────────────────────────────────────

function renderTransactionsPage(transactions) {
  renderSearchAndFilters('mAllTxControls');
  renderSearchAndFilters('dAllTxControls');
  renderTxList('mAllTxList', transactions);
  renderTxList('dAllTxList', transactions);
}

function renderTxList(containerId, transactions) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let filtered = transactions;
  if (state.txTypeFilter !== 'all') {
    filtered = filtered.filter((t) => t.type === state.txTypeFilter);
  }

  const query = state.txSearchQuery.trim().toLowerCase();

  if (query) {
    // Busca ativa: sempre lista plana, destacando a descrição
    const matches = filtered.filter((t) => t.desc?.toLowerCase().includes(query));
    renderFlatTxList(container, matches, query);
  } else if (state.txGrouped) {
    // Modo agrupado por categoria
    renderGroupedTransactions(container, filtered);
  } else {
    // Padrão: lista plana ordenada por data
    renderFlatTxList(container, filtered, '');
  }
}

function renderFlatTxList(container, transactions, query) {
  const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  if (!sorted.length) {
    const msg = query
      ? `Nenhum resultado para "<strong>${escapeHtml(query)}</strong>"`
      : 'Nenhum lançamento neste mês';
    container.innerHTML = `<div class="empty">${msg}</div>`;
    return;
  }
  container.innerHTML = `<div class="tx-flat-list">${sorted.map((t) => renderFlatTxItem(t)).join('')}</div>`;
}

function renderFlatTxItem(transaction) {
  const safeDesc = escapeHtml(transaction.desc).replace(/'/g, "\\'");
  return `
    <div class="tx-card tx-item-clickable ${transaction.type}" onclick="openTxHistory('${safeDesc}')">
      <div class="tx-card-top">
        <div class="tx-card-title">
          <div class="tx-card-ico ${transaction.type}">${txTypeIcon(transaction.type)}</div>
          <span class="tx-name">${escapeHtml(transaction.desc)}</span>
        </div>
        <div class="tx-card-amt ${transaction.type === 'income' ? 'positive' : 'negative'}">
          ${transaction.type === 'income' ? '+' : '−'} ${formatCurrency(transaction.val)}
        </div>
      </div>
      
      <div class="tx-card-middle">
        <span class="tx-cat-badge ${transaction.type}">
          ${catGroupIcon()}
          ${escapeHtml(transaction.cat || 'Outros')}
        </span>
      </div>
      
      <div class="tx-card-bottom">
        <div class="tx-card-date">${formatDateTime(transaction.date)}</div>
        <div class="tx-card-actions">
          <button class="tx-action-btn edit" onclick="event.stopPropagation(); window.editTx ? window.editTx('${transaction.id}') : alert('Em breve')" aria-label="Editar" title="Editar">
            <svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <button class="tx-action-btn delete" onclick="event.stopPropagation(); delTx('${transaction.id}')" aria-label="Excluir" title="Excluir">
            <svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

// ─── Controles da aba de Transações ─────────────────────────────────────────

// SVGs para o pill de tipo na aba de transações
const TX_TYPE_ICONS = {
  all:     '<svg class="dvp-svg" viewBox="0 0 24 24"><path d="M3 12h18"/><path d="M3 6h18"/><path d="M3 18h12"/></svg>',
  income:  '<svg class="dvp-svg" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
  expense: '<svg class="dvp-svg" viewBox="0 0 24 24"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>',
};
const TX_TYPE_LABELS = { all: 'Todas', income: 'Receitas', expense: 'Despesas' };
const TX_TYPE_OPTS   = ['all', 'income', 'expense'];

function renderSearchAndFilters(controlsId) {
  const container = document.getElementById(controlsId);
  if (!container) return;

  const q   = state.txSearchQuery;
  const f   = state.txTypeFilter;
  const grp = state.txGrouped;
  const dropId = `${controlsId}-typedrop`;

  container.innerHTML = `
    <div class="tx-controls">
      <div class="tx-topbar">
        <!-- Pill seletor de tipo -->
        <div class="dash-view-selector tx-type-selector">
          <button
            class="dash-view-pill tx-type-pill${f === 'income' ? ' income' : f === 'expense' ? ' expense' : ''}"
            onclick="toggleDashViewDropdown('${dropId}')"
            aria-haspopup="listbox"
          >
            ${TX_TYPE_ICONS[f]}
            <span class="dvp-label">${TX_TYPE_LABELS[f]}</span>
            <svg class="dvp-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          <div class="dash-view-dropdown tx-type-dropdown" id="${dropId}" role="listbox">
            ${TX_TYPE_OPTS.map((k) => `
              <button class="dv-option${k === f ? ' active' : ''}" role="option"
                      onclick="setTxFilter('${k}')">
                <span class="dv-opt-icon">${TX_TYPE_ICONS[k]}</span>
                <span>${TX_TYPE_LABELS[k]}</span>
                ${k === f ? '<span class="dv-check">&#10003;</span>' : ''}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Toggle lista plana / agrupada -->
        <button
          class="tx-group-toggle${grp ? ' active' : ''}"
          onclick="setTxGrouped(${!grp})"
          title="${grp ? 'Listar sem categorias' : 'Agrupar por categoria'}"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="5" width="7" height="4" rx="1"/>
            <rect x="3" y="13" width="7" height="4" rx="1"/>
            <path d="M14 7h7"/><path d="M14 15h7"/>
          </svg>
          <span>${grp ? 'Categorias' : 'Por data'}</span>
        </button>
      </div>

      <!-- Barra de busca -->
      <div class="tx-search-wrap">
        <svg class="tx-search-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7"/>
          <path d="M16.5 16.5l4 4"/>
        </svg>
        <input
          id="${controlsId}-input"
          class="tx-search-input"
          type="search"
          placeholder="Buscar por descrição…"
          value="${escapeHtml(q)}"
          oninput="setTxSearch(this.value)"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
        />
        <button
          class="tx-search-clear"
          onclick="setTxSearch('')"
          aria-label="Limpar busca"
          style="opacity:${q ? '1' : '0'};pointer-events:${q ? 'auto' : 'none'}"
        >✕</button>
      </div>
    </div>
  `;
}

export function setTxSearch(value) {
  state.txSearchQuery = value;
  const monthly = state.transactions.filter(
    (t) => t.month === state.currentMonth && t.year === state.currentYear,
  );
  // NÃO re-renderiza os controles (destruiria o <input> e fecharia o teclado).
  // Apenas atualiza a visibilidade do botão de limpar no DOM.
  document.querySelectorAll('.tx-search-clear').forEach((btn) => {
    btn.style.opacity = value ? '1' : '0';
    btn.style.pointerEvents = value ? 'auto' : 'none';
  });
  renderTxList('mAllTxList', monthly);
  renderTxList('dAllTxList', monthly);
}

export function setTxFilter(type) {
  state.txTypeFilter = type;
  const monthly = state.transactions.filter(
    (t) => t.month === state.currentMonth && t.year === state.currentYear,
  );
  renderSearchAndFilters('mAllTxControls');
  renderSearchAndFilters('dAllTxControls');
  renderTxList('mAllTxList', monthly);
  renderTxList('dAllTxList', monthly);
}

export function setTxGrouped(grouped) {
  state.txGrouped = grouped;
  const monthly = state.transactions.filter(
    (t) => t.month === state.currentMonth && t.year === state.currentYear,
  );
  renderSearchAndFilters('mAllTxControls');
  renderSearchAndFilters('dAllTxControls');
  renderTxList('mAllTxList', monthly);
  renderTxList('dAllTxList', monthly);
}

// ─── Modal Histórico por Descrição ────────────────────────────────────────────

export function openTxHistory(desc) {
  state.selectedTxDesc = desc;
  const modal = document.getElementById('txHistoryModal');
  if (!modal) return;

  const monthTransactions = state.transactions.filter(
    (t) => t.month === state.currentMonth && t.year === state.currentYear && t.desc === desc,
  );

  const totalIncome  = monthTransactions.filter((t) => t.type === 'income').reduce((s, t)  => s + t.val, 0);
  const totalExpense = monthTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.val, 0);
  const net    = totalIncome - totalExpense;
  const sorted = [...monthTransactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const monthLabel = `${MONTHS[state.currentMonth]} ${state.currentYear}`;

  modal.innerHTML = `
    <div class="tx-history-sheet" id="txHistorySheet">
      <div class="modal-handle"></div>
      <div class="tx-history-header">
        <div class="tx-history-title-wrap">
          <div class="tx-history-title">${escapeHtml(desc)}</div>
          <div class="tx-history-period">${monthLabel} · ${sorted.length} lançamento${sorted.length !== 1 ? 's' : ''}</div>
        </div>
        <button class="tx-history-close" onclick="closeTxHistory()" aria-label="Fechar">✕</button>
      </div>
      <div class="tx-history-summary">
        ${totalIncome  > 0 ? `<div class="tx-hist-metric income"><span>Entradas</span><strong>+ ${formatCurrency(totalIncome)}</strong></div>` : ''}
        ${totalExpense > 0 ? `<div class="tx-hist-metric expense"><span>Saídas</span><strong>− ${formatCurrency(totalExpense)}</strong></div>` : ''}
        <div class="tx-hist-metric net ${net >= 0 ? 'positive' : 'negative'}">
          <span>Líquido</span>
          <strong>${net >= 0 ? '+' : '−'} ${formatCurrency(Math.abs(net))}</strong>
        </div>
      </div>
      <div class="tx-history-list">
        ${sorted.length === 0
          ? '<div class="empty">Nenhum lançamento encontrado</div>'
          : sorted.map((t) => `
              <div class="tx-hist-item">
                <div class="tx-ico ${t.type}">${txTypeIcon(t.type)}</div>
                <div class="tx-info">
                  <div class="tx-name">${escapeHtml(t.cat || 'Outros')}</div>
                  <div class="tx-meta">${formatDateTime(t.date)} · ${t.type === 'income' ? 'Entrada' : 'Saída'}</div>
                </div>
                <div class="tx-amt ${t.type === 'income' ? 'positive' : 'negative'}">
                  ${t.type === 'income' ? '+' : '−'} ${formatCurrency(t.val)}
                </div>
              </div>
            `).join('')}
      </div>
    </div>
  `;

  modal.classList.add('show');
  requestAnimationFrame(() => {
    document.getElementById('txHistorySheet')?.classList.add('open');
  });
}

export function closeTxHistory() {
  state.selectedTxDesc = null;
  const modal = document.getElementById('txHistoryModal');
  const sheet = document.getElementById('txHistorySheet');
  if (!modal) return;
  if (sheet) {
    sheet.classList.remove('open');
    sheet.addEventListener('transitionend', () => modal.classList.remove('show'), { once: true });
  } else {
    modal.classList.remove('show');
  }
}

// ─── Funções Auxiliares ───────────────────────────────────────────────────────

function renderMobileSpotlight(containerId, highestExpense, totalExpense) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!highestExpense) {
    container.innerHTML = '<div class="empty">Nenhum lançamento neste mês</div>';
    return;
  }
  const percent = Math.max(18, Math.min(100, Math.round((highestExpense.val / Math.max(totalExpense, 1)) * 100)));
  container.innerHTML = `
    <div class="m-top-expense">
      <div>
        <small>Maior transação</small>
        <strong>${formatCurrency(highestExpense.val)}</strong>
      </div>
      <span>${escapeHtml(highestExpense.desc)}</span>
    </div>
    <div class="m-top-expense-bar"><i style="width:${percent}%"></i></div>
  `;
}

function getMonthPeriodLabel(year, month) {
  const start = new Date(year, month, 1);
  const end   = new Date(year, month + 1, 0);
  const fmt   = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  return `${fmt(start)} — ${fmt(end)}`;
}

function renderSixMonthChart(containerId, allTransactions) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const monthsMap = {};
  for (let i = 5; i >= 0; i--) {
    const d   = new Date(state.currentYear, state.currentMonth - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('pt-BR', { month: 'short' }).substring(0, 3);
    monthsMap[key] = { label, income: 0, expense: 0 };
  }

  allTransactions.forEach((tx) => {
    const txDate = new Date(tx.date);
    const key = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
    if (monthsMap[key]) {
      if (tx.type === 'income') monthsMap[key].income += tx.val;
      else monthsMap[key].expense += tx.val;
    }
  });

  const data   = Object.values(monthsMap);
  const maxVal = data.reduce((m, d) => Math.max(m, d.income, d.expense), 1);

  const barsHTML = data.map((d) => {
    const incPct = (d.income  / maxVal) * 100;
    const expPct = (d.expense / maxVal) * 100;
    return `
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1">
        <div style="font-size:9px;color:var(--text3);height:12px;font-weight:bold;white-space:nowrap">
          ${d.income > 0 ? formatCompactCurrency(d.income) : ''}
        </div>
        <div style="height:120px;width:100%;display:flex;gap:4px;align-items:flex-end;justify-content:center">
          <div style="height:${incPct}%;width:16px;background:var(--green);border-radius:4px 4px 0 0;transition:height .3s"></div>
          <div style="height:${expPct}%;width:16px;background:var(--red);border-radius:4px 4px 0 0;transition:height .3s"></div>
        </div>
        <div style="font-size:9px;color:var(--text3);height:12px;font-weight:bold;white-space:nowrap">
          ${d.expense > 0 ? formatCompactCurrency(d.expense) : ''}
        </div>
        <div style="font-size:11px;font-weight:bold;color:var(--text2);text-transform:capitalize;margin-top:8px">${d.label}</div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div style="padding:24px;background:var(--card);border-radius:24px;border:1px solid var(--border)">
      <div style="display:flex;justify-content:space-between;align-items:flex-end">${barsHTML}</div>
      <div style="display:flex;justify-content:center;gap:20px;margin-top:20px;font-size:13px;font-weight:bold;color:var(--text2)">
        <div style="display:flex;align-items:center;gap:6px"><span style="width:12px;height:12px;border-radius:3px;background:var(--green)"></span> Receitas</div>
        <div style="display:flex;align-items:center;gap:6px"><span style="width:12px;height:12px;border-radius:3px;background:var(--red)"></span> Despesas</div>
      </div>
    </div>
  `;
}

function renderGroupedTransactions(container, transactions) {
  const recent = [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 50);

  if (!recent.length) {
    container.innerHTML = '<div class="empty">Nenhum lançamento neste mês</div>';
    return;
  }

  const grouped = new Map();
  recent.forEach((t) => {
    const key      = t.cat || 'Outros';
    const existing = grouped.get(key) || { category: key, latestDate: t.date, transactions: [], total: 0 };
    existing.transactions.push(t);
    existing.total     += t.type === 'income' ? t.val : -t.val;
    existing.latestDate = new Date(t.date) > new Date(existing.latestDate) ? t.date : existing.latestDate;
    grouped.set(key, existing);
  });

  const groups = [...grouped.values()].sort((a, b) => new Date(b.latestDate) - new Date(a.latestDate));
  container.innerHTML = groups.map((g) => renderGroupSection(g)).join('');
}

function renderGroupSection(group) {
  const cls    = group.total >= 0 ? 'positive' : 'negative';
  const prefix = group.total >= 0 ? '+' : '-';
  return `
    <details class="group-section">
      <summary class="group-head">
        <div class="group-title-wrap">
          <div class="group-icon" style="color:${CATEGORY_COLORS[group.category] || 'var(--text)'}">
            ${catGroupIcon()}
          </div>
          <div>
            <div class="group-title">${escapeHtml(group.category)}</div>
            <div class="group-meta">${group.transactions.length} ${group.transactions.length === 1 ? 'lançamento' : 'lançamentos'}</div>
          </div>
        </div>
        <div class="group-total ${cls}">${prefix} ${formatCurrency(Math.abs(group.total))}</div>
      </summary>
      <div class="group-list">
        ${group.transactions.map((t) => renderTransactionItem(t)).join('')}
      </div>
    </details>
  `;
}

function renderTransactionItem(transaction) {
  const safeDesc = escapeHtml(transaction.desc).replace(/'/g, "\\'");
  return `
    <div class="tx-card tx-item-clickable" onclick="openTxHistory('${safeDesc}')">
      <div class="tx-card-top">
        <div class="tx-card-title">
          <div class="tx-card-ico ${transaction.type}">${txTypeIcon(transaction.type)}</div>
          <span class="tx-name">${escapeHtml(transaction.desc)}</span>
        </div>
        <div class="tx-card-amt ${transaction.type === 'income' ? 'positive' : 'negative'}">
          ${transaction.type === 'income' ? '+' : '-'} ${formatCurrency(transaction.val)}
        </div>
      </div>
      
      <div class="tx-card-middle">
        <span class="tx-cat-badge">
          ${catGroupIcon()}
          ${escapeHtml(transaction.cat || 'Outros')}
        </span>
      </div>
      
      <div class="tx-card-bottom">
        <div class="tx-card-date">${formatDateTime(transaction.date)}</div>
        <div class="tx-card-actions">
          <button class="tx-action-btn edit" onclick="event.stopPropagation(); window.editTx ? window.editTx('${transaction.id}') : alert('Em breve')" aria-label="Editar" title="Editar">
            <svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <button class="tx-action-btn delete" onclick="event.stopPropagation(); delTx('${transaction.id}')" aria-label="Excluir" title="Excluir">
            <svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

// ─── Gráfico Donut ────────────────────────────────────────────────────────────

function renderDonutCharts(sortedCategories, totalValue, isIncome = false) {
  const markup = buildDonutMarkup(sortedCategories, totalValue, isIncome);
  const mobileChart  = document.getElementById('mBarChart');
  const desktopChart = document.getElementById('dBarChart');
  if (mobileChart)  mobileChart.innerHTML  = markup;
  if (desktopChart) desktopChart.innerHTML = markup;
}

function buildDonutMarkup(sortedCategories, totalValue, isIncome) {
  if (!sortedCategories.length || !totalValue) {
    const emptyLabel = isIncome ? 'Sem receitas neste mês' : 'Sem gastos neste mês';
    return `<div class="empty">${emptyLabel}</div>`;
  }

  let current = 0;
  const chartStops = sortedCategories.map(([cat, val], i) => {
    const start = current;
    const pct   = (val / totalValue) * 100;
    current    += pct;
    const color = isIncome
      ? INCOME_PALETTE[i % INCOME_PALETTE.length]
      : (CATEGORY_COLORS[cat] || '#71717a');
    return `${color} ${start.toFixed(2)}% ${current.toFixed(2)}%`;
  });

  const [topCat, topVal] = sortedCategories[0];
  const topShare = Math.round((topVal / totalValue) * 100);
  const typeLabel = isIncome ? 'receita' : 'gasto';

  return `
    <div class="chart-layout">
      <div class="donut-shell">
        <div class="donut-chart" style="background:conic-gradient(${chartStops.join(', ')})">
          <div class="donut-hole">
            <span>Total ${isIncome ? 'receitas' : 'gastos'}</span>
            <strong>${formatCurrency(totalValue)}</strong>
            <small>${sortedCategories.length} categorias</small>
          </div>
        </div>
      </div>
      <div class="donut-side">
        <div class="chart-highlight${isIncome ? ' income-highlight' : ''}">
          <span>Categoria dominante</span>
          <strong>${escapeHtml(topCat)}</strong>
          <p>${topShare}% do total de ${typeLabel}s concentrado em <strong>${escapeHtml(topCat)}</strong>.</p>
        </div>
        <div class="donut-legend">
          ${sortedCategories.map(([cat, val], i) => {
            const color = isIncome
              ? INCOME_PALETTE[i % INCOME_PALETTE.length]
              : (CATEGORY_COLORS[cat] || '#71717a');
            return `
              <div class="legend-item">
                <span class="legend-dot" style="background:${color}"></span>
                <div>
                  <div class="legend-name">${escapeHtml(cat)}</div>
                  <div class="legend-meta">${Math.round((val / totalValue) * 100)}% do total</div>
                </div>
                <div class="legend-value">${formatCurrency(val)}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

function formatDateTime(value) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).replace(',', ' ·');
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
