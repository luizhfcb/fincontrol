// Aba de Transações: lista plana agrupada por dia, agrupamento por categoria,
// busca por descrição e filtro por tipo.
import { MONTHS } from '../core/constants.js';
import { state } from '../core/state.js';
import { formatCurrency, getMonthlyTransactions } from '../core/utils.js';
import { catColor, escapeHtml, txTypeIcon } from './ui-helpers.js';
// Side effects: registra listeners de swipe e window.onTxRowClick
import './tx-swipe.js';

export function renderTransactionsPage(transactions) {
  renderSearchAndFilters('mAllTxControls');
  renderSearchAndFilters('dAllTxControls');
  renderTxList('mAllTxList', transactions);
  renderTxList('dAllTxList', transactions);
}

export function renderTxList(containerId, transactions) {
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

/** Expande/recolhe o container de um dia ao clicar no cabeçalho. */
window.toggleTxDay = function (btn) {
  const card = btn.closest('.tx-day-card');
  if (!card) return;
  const collapsed = card.classList.toggle('collapsed');
  btn.setAttribute('aria-expanded', String(!collapsed));
};

const TX_WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

function txDayKey(value) {
  const d = new Date(value);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function txDayLabel(value) {
  const d = new Date(value);
  const day = String(d.getDate()).padStart(2, '0');
  const mon = MONTHS[d.getMonth()].slice(0, 3).toUpperCase();
  return `${day} ${mon} - ${TX_WEEKDAYS[d.getDay()]}`;
}

function txTime(value) {
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Tira de resumo do conjunto exibido: contagem + entradas/saídas. */
function txSummaryHtml(list) {
  const income  = list.filter((t) => t.type === 'income').reduce((s, t)  => s + t.val, 0);
  const expense = list.filter((t) => t.type === 'expense').reduce((s, t) => s + t.val, 0);
  const n = list.length;
  return `
    <div class="tx-summary">
      <div class="tx-summary-count">
        <strong>${n}</strong>
        <span>${n === 1 ? 'lançamento' : 'lançamentos'}</span>
      </div>
      <div class="tx-summary-flows">
        <span class="tx-sum-in">↗ ${formatCurrency(income)}</span>
        <span class="tx-sum-out">↘ ${formatCurrency(expense)}</span>
      </div>
    </div>`;
}

/** Linha compacta de transação (estilo extrato). Usada na lista plana e agrupada. */
function txRowHtml(transaction) {
  const safeDesc = escapeHtml(transaction.desc).replace(/'/g, "\\'");
  const isIncome = transaction.type === 'income';
  return `
    <div class="tx-swipe">
      <div class="tx-swipe-action edit" aria-hidden="true">
        <button class="tx-swipe-btn edit" onclick="event.stopPropagation(); window.editTx ? window.editTx('${transaction.id}') : alert('Em breve')" aria-label="Editar" title="Editar" tabindex="-1">
          <svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        </button>
      </div>
      <div class="tx-swipe-action delete" aria-hidden="true">
        <button class="tx-swipe-btn delete" onclick="event.stopPropagation(); delTx('${transaction.id}')" aria-label="Excluir" title="Excluir" tabindex="-1">
          <svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
      </div>
      <div class="tx-row ${transaction.type}" onclick="onTxRowClick(event, '${safeDesc}')">
        <div class="tx-row-ico ${transaction.type}">${txTypeIcon(transaction.type)}</div>
        <div class="tx-row-body">
          <span class="tx-row-desc">${escapeHtml(transaction.desc)}</span>
          <span class="tx-row-sub">
            <span class="tx-row-cat">${escapeHtml(transaction.cat || 'Outros')}</span>
            <span class="tx-row-dot" aria-hidden="true">·</span>
            <span class="tx-row-time">${txTime(transaction.date)}</span>
          </span>
        </div>
        <div class="tx-row-right">
          <span class="tx-row-amt ${isIncome ? 'positive' : 'negative'}">${isIncome ? '+' : '−'} ${formatCurrency(transaction.val)}</span>
        </div>
      </div>
    </div>`;
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

  // Agrupa por dia mantendo a ordem decrescente
  const days = [];
  const byKey = new Map();
  for (const t of sorted) {
    const key = txDayKey(t.date);
    if (!byKey.has(key)) {
      const group = { date: t.date, items: [] };
      byKey.set(key, group);
      days.push(group);
    }
    byKey.get(key).items.push(t);
  }

  const daysHtml = days.map((g) => {
    const net    = g.items.reduce((s, t) => s + (t.type === 'income' ? t.val : -t.val), 0);
    const netCls = net >= 0 ? 'positive' : 'negative';
    const count = g.items.length;
    return `
      <div class="tx-day-card">
        <button type="button" class="tx-day" onclick="toggleTxDay(this)" aria-expanded="true">
          <span class="tx-day-main">
            <svg class="tx-day-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
            <span class="tx-day-label">${txDayLabel(g.date)}</span>
            <span class="tx-day-count">${count}</span>
          </span>
          <span class="tx-day-net ${netCls}">${net >= 0 ? '+' : '−'} ${formatCurrency(Math.abs(net))}</span>
        </button>
        <div class="tx-day-rows">${g.items.map((t) => txRowHtml(t)).join('')}</div>
      </div>`;
  }).join('');

  container.innerHTML = `${txSummaryHtml(sorted)}<div class="tx-ledger">${daysHtml}</div>`;
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
  const monthly = getMonthlyTransactions();
  // NÃO re-renderiza os controles (destruiria o <input> e fecharia o teclado).
  // Apenas sincroniza o valor visível e a visibilidade do botão de limpar no DOM.
  document.querySelectorAll('.tx-search-input').forEach((input) => {
    if (input.value !== value) input.value = value;
  });
  document.querySelectorAll('.tx-search-clear').forEach((btn) => {
    btn.style.opacity = value ? '1' : '0';
    btn.style.pointerEvents = value ? 'auto' : 'none';
  });
  renderTxList('mAllTxList', monthly);
  renderTxList('dAllTxList', monthly);
}

export function setTxFilter(type) {
  state.txTypeFilter = type;
  const monthly = getMonthlyTransactions();
  renderSearchAndFilters('mAllTxControls');
  renderSearchAndFilters('dAllTxControls');
  renderTxList('mAllTxList', monthly);
  renderTxList('dAllTxList', monthly);
}

export function setTxGrouped(grouped) {
  state.txGrouped = grouped;
  const monthly = getMonthlyTransactions();
  renderSearchAndFilters('mAllTxControls');
  renderSearchAndFilters('dAllTxControls');
  renderTxList('mAllTxList', monthly);
  renderTxList('dAllTxList', monthly);
}

// ─── Lista agrupada por categoria ────────────────────────────────────────────

/** Ícone de tag SVG para cabeçalho de grupo de categoria */
function catGroupIcon() {
  return '<svg viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>';
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
  container.innerHTML = txSummaryHtml(transactions) + groups.map((g) => renderGroupSection(g)).join('');
}

function renderGroupSection(group) {
  const cls    = group.total >= 0 ? 'positive' : 'negative';
  const prefix = group.total >= 0 ? '+' : '-';
  return `
    <details class="group-section">
      <summary class="group-head">
        <div class="group-title-wrap">
          <div class="group-icon" style="color:${catColor(group.category)}">
            ${catGroupIcon()}
          </div>
          <div class="group-title-text">
            <div class="group-title">${escapeHtml(group.category)}</div>
            <div class="group-meta">${group.transactions.length} ${group.transactions.length === 1 ? 'lançamento' : 'lançamentos'}</div>
          </div>
        </div>
        <div class="group-right">
          <div class="group-total ${cls}">${prefix} ${formatCurrency(Math.abs(group.total))}</div>
          <svg class="group-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
        </div>
      </summary>
      <div class="group-list">
        ${group.transactions.map((t) => txRowHtml(t)).join('')}
      </div>
    </details>
  `;
}
