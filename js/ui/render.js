import { CATEGORY_COLORS, CATEGORY_ICONS, MONTHS } from '../core/constants.js';
import { state } from '../core/state.js';
import { formatCompactCurrency, formatCurrency, getMonthlyTransactions, setText } from '../core/utils.js';
import { renderModules } from './modules.js';

// ─── Paleta de cores para receitas ───────────────────────────────────────────
const INCOME_PALETTE = [
  '#29D6FF', '#12384D', '#6DDFF6', '#7A8B96',
  '#A7DDE9', '#081522', '#AAB7C0', '#4BA9C4',
];

const EXPENSE_PALETTE = [
  '#12384D', '#29D6FF', '#7A8B96', '#A7DDE9',
  '#081522', '#4BA9C4', '#AAB7C0', '#6DDFF6',
  '#5A6B76', '#D7E6EC', '#1C526C', '#8EC7D6',
];

// Cores vívidas e distintas p/ composição do dia — legíveis em tema claro E escuro
const COMPO_PALETTE = [
  '#29D6FF', '#FF6B6B', '#FFD166', '#06D6A0',
  '#A78BFA', '#F78C6B', '#4ADE80', '#F472B6',
  '#38BDF8', '#FBBF24', '#22D3EE', '#FB7185',
];

/** Monograma: 1ª letra útil da descrição (fallback #). */
function txMonogram(desc) {
  const s = (desc || '').trim();
  return s ? s[0].toUpperCase() : '#';
}

/** Cor da categoria: mapa fixo p/ conhecidas, hash estável p/ dinâmicas. */
function catColor(name) {
  if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return COMPO_PALETTE[h % COMPO_PALETTE.length];
}

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
  const monthlyTransactions = getMonthlyTransactions();

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

  // ── Atualiza métrica principal do dashboard ────────────────────────────────
  ['mBalance'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = formatCurrency(heroValue);
    el.className   = `big-val ${heroClass}`;
  });

  const desktopBalance = document.getElementById('dBalance');
  if (desktopBalance) {
    desktopBalance.textContent = formatCurrency(balance);
    desktopBalance.className = `val ${balance >= 0 ? 'positive' : 'negative'}`;
  }

  const mobileBalanceCard = document.getElementById('mBalanceCard');
  if (mobileBalanceCard) {
    mobileBalanceCard.textContent = formatCurrency(balance);
    mobileBalanceCard.className = balance >= 0 ? 'positive' : 'negative';
    // Marca o card de saldo p/ estilo condicional (negativo = alerta / >=0 = marca)
    const balanceArticle = mobileBalanceCard.closest('.m-summary-card.balance');
    if (balanceArticle) {
      balanceArticle.classList.toggle('is-negative', balance < 0);
      balanceArticle.classList.toggle('is-positive', balance >= 0);
    }
  }
  setText('mBalanceLabel', balanceLabel);
  setText('dBalanceLabel', balanceLabel);

  // ── Barra de fluxo (proporção receitas × despesas no card de saldo) ────────
  const flowIncome  = document.getElementById('mFlowIncome');
  const flowExpense = document.getElementById('mFlowExpense');
  if (flowIncome && flowExpense) {
    const flowTotal = income + expense;
    const incomePct = flowTotal > 0 ? (income / flowTotal) * 100 : 0;
    flowIncome.style.width  = `${incomePct.toFixed(1)}%`;
    flowExpense.style.width = `${flowTotal > 0 ? (100 - incomePct).toFixed(1) : 0}%`;
    flowIncome.parentElement.classList.toggle('is-empty', flowTotal <= 0);
  }
  const flowCaption = document.getElementById('mFlowCaption');
  if (flowCaption) {
    if (income <= 0 && expense <= 0) {
      flowCaption.textContent = 'Sem lançamentos neste mês';
    } else if (income <= 0) {
      flowCaption.textContent = 'Nenhuma receita registrada';
    } else {
      flowCaption.textContent = `Despesas somam ${Math.round((expense / income) * 100)}% das receitas`;
    }
  }

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

  renderExpenseHeatmap('mExpenseHeatmap', monthlyTransactions);
  renderExpenseHeatmap('dExpenseHeatmap', monthlyTransactions);
  renderTransactionsPage(monthlyTransactions);
  renderDonutCharts(sortedCategories, chartTotal, chartIsIncome);
  renderWeekdayChart('mWeekdayChart', monthlyTransactions);
  renderMonthlyTrend('mSixMonthChart', state.transactions);
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

// Expande/recolhe blocos de relatório (mobile). Estados independentes em state.
export function toggleReportBlock(key) {
  const cfg = {
    heatmap: {
      prop: 'heatmapExpanded',
      header: '#mExpenseHeatmap .report-head',
      body: '#mExpenseHeatmap .collapse-shell',
    },
    chart: {
      prop: 'chartExpanded',
      header: '#mChartHeader',
      body: '#mChartBody',
    },
  }[key];
  if (!cfg) return;

  const expanded = state[cfg.prop] = !state[cfg.prop];
  const header = document.querySelector(cfg.header);
  const body = document.querySelector(cfg.body);
  if (header) header.setAttribute('aria-expanded', String(expanded));
  if (body) body.classList.toggle('collapsed', !expanded);
}

export function selectExpenseHeatmapDay(day) {
  state.heatmapSelectedDay = Number(day) || 1;
  const monthlyTransactions = getMonthlyTransactions();
  renderExpenseHeatmap('mExpenseHeatmap', monthlyTransactions);
  renderExpenseHeatmap('dExpenseHeatmap', monthlyTransactions);
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

/* ─── Swipe-to-action nas linhas de transação ───────────────────────────────
   Desliza esquerda -> revela Excluir; direita -> revela Editar. Vanilla JS.
   Delegação de pointer no document, registrada 1x. */
const SWIPE_REVEAL = 72;   // px que a linha abre em cada lado
const SWIPE_TRIGGER = 40;  // px mínimo pra "abrir"; abaixo disso volta ao lugar
let swipe = null;          // gesto ativo { el, row, startX, startY, dx, axis, moved }
let swipeJustEnded = 0;    // timestamp: suprime o click sintético pós-arraste

function closeSwipe(el) {
  if (el) el.classList.remove('open-left', 'open-right');
}
function closeAllSwipes(except) {
  document.querySelectorAll('.tx-swipe.open-left, .tx-swipe.open-right')
    .forEach((el) => { if (el !== except) closeSwipe(el); });
}

function onSwipeStart(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const target = e.target;
  if (target.closest('.tx-swipe-action')) return; // clique no botão revelado
  const el = target.closest('.tx-swipe');
  closeAllSwipes(el);
  if (!el) return;
  swipe = {
    el,
    row: el.querySelector('.tx-row'),
    startX: e.clientX,
    startY: e.clientY,
    dx: 0,
    axis: null,   // 'x' | 'y' após decidir direção
    moved: false,
  };
}

function onSwipeMove(e) {
  if (!swipe) return;
  const dx = e.clientX - swipe.startX;
  const dy = e.clientY - swipe.startY;

  if (!swipe.axis) {
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
    swipe.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (swipe.axis === 'x') {
      swipe.el.classList.add('dragging');
      // já pode ter começado aberto: soma offset atual
      if (swipe.el.classList.contains('open-left'))  swipe.startX += SWIPE_REVEAL;
      if (swipe.el.classList.contains('open-right')) swipe.startX -= SWIPE_REVEAL;
    }
  }
  if (swipe.axis !== 'x') return; // scroll vertical: deixa passar

  e.preventDefault();
  swipe.moved = true;
  // resistência além do limite de revelação
  let d = e.clientX - swipe.startX;
  if (d < -SWIPE_REVEAL) d = -SWIPE_REVEAL + (d + SWIPE_REVEAL) * 0.25;
  if (d >  SWIPE_REVEAL) d =  SWIPE_REVEAL + (d - SWIPE_REVEAL) * 0.25;
  swipe.dx = d;
  swipe.row.style.transform = `translateX(${d}px)`;
}

function onSwipeEnd() {
  if (!swipe) return;
  const { el, row, dx, axis, moved } = swipe;
  if (axis === 'x') {
    el.classList.remove('dragging');
    row.style.transform = '';
    closeSwipe(el);
    if (dx <= -SWIPE_TRIGGER)      el.classList.add('open-left');  // revela excluir
    else if (dx >= SWIPE_TRIGGER)  el.classList.add('open-right'); // revela editar
    if (moved) swipeJustEnded = Date.now();
  }
  swipe = null;
}

function initTxSwipe() {
  if (window.__txSwipeInit) return;
  window.__txSwipeInit = true;
  document.addEventListener('pointerdown', onSwipeStart, { passive: true });
  document.addEventListener('pointermove', onSwipeMove, { passive: false });
  document.addEventListener('pointerup', onSwipeEnd, { passive: true });
  document.addEventListener('pointercancel', onSwipeEnd, { passive: true });
}
initTxSwipe();

/** Clique na linha: se estava aberta (ou acabou de deslizar), só fecha. */
window.onTxRowClick = function (event, safeDesc) {
  const el = event.currentTarget.closest('.tx-swipe');
  if (el && (el.classList.contains('open-left') || el.classList.contains('open-right'))) {
    closeSwipe(el);
    return;
  }
  if (Date.now() - swipeJustEnded < 350) return; // ignorar clique pós-arraste
  openTxHistory(safeDesc);
};

/** Expande/recolhe o container de um dia ao clicar no cabeçalho. */
window.toggleTxDay = function (btn) {
  const card = btn.closest('.tx-day-card');
  if (!card) return;
  const collapsed = card.classList.toggle('collapsed');
  btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
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

// ─── Modal Histórico por Descrição ────────────────────────────────────────────

export function openTxHistory(desc) {
  state.selectedTxDesc = desc;
  const modal = document.getElementById('txHistoryModal');
  if (!modal) return;

  const monthTransactions = getMonthlyTransactions().filter((t) => t.desc === desc);

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
          <div class="sixm-bar" role="button" tabindex="0"
               data-label="${d.label} · Receitas" data-value="${formatCurrency(d.income)}" data-tone="income"
               onclick="selectSixMonthBar(this)" onkeydown="${BAR_KEY_SIXM}"
               title="${d.label} · Receitas: ${formatCurrency(d.income)}"
               style="height:${incPct}%;width:16px;background:var(--green);border-radius:4px 4px 0 0;transition:height .3s;cursor:pointer"></div>
          <div class="sixm-bar" role="button" tabindex="0"
               data-label="${d.label} · Despesas" data-value="${formatCurrency(d.expense)}" data-tone="expense"
               onclick="selectSixMonthBar(this)" onkeydown="${BAR_KEY_SIXM}"
               title="${d.label} · Despesas: ${formatCurrency(d.expense)}"
               style="height:${expPct}%;width:16px;background:var(--red);border-radius:4px 4px 0 0;transition:height .3s;cursor:pointer"></div>
        </div>
        <div style="font-size:9px;color:var(--text3);height:12px;font-weight:bold;white-space:nowrap">
          ${d.expense > 0 ? formatCompactCurrency(d.expense) : ''}
        </div>
        <div style="font-size:11px;font-weight:bold;color:var(--text2);text-transform:capitalize;margin-top:8px">${d.label}</div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div data-sixmonth style="padding:24px;background:var(--card);border-radius:24px;border:1px solid var(--border)">
      <div style="display:flex;justify-content:space-between;align-items:flex-end">${barsHTML}</div>
      <div class="fin-bar-readout" aria-live="polite"></div>
      <div style="display:flex;justify-content:center;gap:20px;margin-top:20px;font-size:13px;font-weight:bold;color:var(--text2)">
        <div style="display:flex;align-items:center;gap:6px"><span style="width:12px;height:12px;border-radius:3px;background:var(--green)"></span> Receitas</div>
        <div style="display:flex;align-items:center;gap:6px"><span style="width:12px;height:12px;border-radius:3px;background:var(--red)"></span> Despesas</div>
      </div>
    </div>
  `;
}

function renderExpenseHeatmap(containerId, transactions) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const daysInMonth = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
  const firstWeekday = new Date(state.currentYear, state.currentMonth, 1).getDay();
  const expenses = transactions.filter((transaction) => transaction.type === 'expense');
  const days = Array.from({ length: daysInMonth }, (_, index) => ({
    day: index + 1,
    total: 0,
    transactions: [],
  }));

  expenses.forEach((transaction) => {
    const date = new Date(transaction.date);
    const dayIndex = date.getDate() - 1;
    if (dayIndex < 0 || dayIndex >= days.length) return;
    days[dayIndex].total += Number(transaction.val) || 0;
    days[dayIndex].transactions.push(transaction);
  });

  const totalMonth = days.reduce((sum, day) => sum + day.total, 0);
  const maxDayTotal = Math.max(...days.map((day) => day.total), 0);
  const selectedDay = Math.min(
    daysInMonth,
    Math.max(1, Number(state.heatmapSelectedDay) || new Date().getDate()),
  );
  state.heatmapSelectedDay = selectedDay;
  const selected = days[selectedDay - 1];
  const selectedExpenses = [...selected.transactions].sort((a, b) => b.val - a.val);
  const biggest = selectedExpenses[0];
  const others = selectedExpenses.slice(1);

  // ── Métricas do dia (estilo "Zap Gastos") ──────────────────────────────
  const selectedDow = new Date(state.currentYear, state.currentMonth, selectedDay).getDay();
  const activeDays   = days.filter((d) => d.total > 0).length;
  const dailyAvg     = activeDays ? totalMonth / activeDays : 0;
  const multiplier   = dailyAvg ? selected.total / dailyAvg : 0;
  const txCount      = selected.transactions.length;

  // Composição: fatia de cada despesa no total do dia (cores distintas)
  const compo = selected.total > 0
    ? selectedExpenses.map((t, i) => ({
        t,
        pct: (t.val / selected.total) * 100,
        color: COMPO_PALETTE[i % COMPO_PALETTE.length],
      }))
    : [];
  // Cor por transação (índice = ordem em selectedExpenses) p/ ícones da lista
  const colorFor = (i) => COMPO_PALETTE[i % COMPO_PALETTE.length];

  const compoBarHtml = compo.map((c) => `
    <span class="day-compo-seg" style="width:${c.pct.toFixed(2)}%;background:${c.color}"
          title="${escapeHtml(c.t.desc)}: ${formatCurrency(c.t.val)} (${c.pct.toFixed(0)}%)"></span>
  `).join('');

  const compoLegendHtml = compo.map((c) => `
    <div class="dcl-item">
      <span class="dcl-dot" style="background:${c.color}"></span>
      <span class="dcl-name">${escapeHtml(c.t.desc)}</span>
      <span class="dcl-val">${formatCurrency(c.t.val)}</span>
    </div>
  `).join('');

  const compositionHtml = compo.length ? `
    <div class="day-compo">
      <span class="day-section-title">Composição</span>
      <div class="day-compo-bar">${compoBarHtml}</div>
      <div class="day-compo-legend">${compoLegendHtml}</div>
    </div>` : '';

  const badgeHtml = multiplier > 1
    ? `<span class="day-typical-badge">${multiplier.toFixed(1)}x o seu dia típico</span>`
    : '';

  // Só o bloco mobile é colapsável; o desktop mantém o layout completo.
  const collapsible = containerId === 'mExpenseHeatmap';
  const expanded = !!state.heatmapExpanded;
  const headAttrs = collapsible
    ? ` report-head report-toggle" role="button" tabindex="0" onclick="toggleReportBlock('heatmap')" aria-expanded="${expanded}"`
    : '"';
  const chevron = collapsible
    ? '<svg class="report-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'
    : '';

  container.innerHTML = `
    <div class="heatmap-head${headAttrs}>
      <div>
        <span>Despesas por dia</span>
        <h3>Mapa de Calor${chevron}</h3>
      </div>
      <div class="heatmap-total">
        <small>Total Gasto no Mês</small>
        <strong>${formatCurrency(totalMonth)}</strong>
      </div>
    </div>
    <div class="${collapsible ? `collapse-shell${expanded ? '' : ' collapsed'}` : ''}">
    <div class="${collapsible ? 'collapse-inner' : 'heatmap-body'}">
    <div class="heatmap-weekdays" aria-hidden="true">
      <span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span>
    </div>
    <div class="heatmap-grid">
      ${Array.from({ length: firstWeekday }, () => '<span class="heatmap-day-spacer" aria-hidden="true"></span>').join('')}
      ${days.map((day) => `
        <button
          class="heatmap-day ${getHeatmapTone(day.total, maxDayTotal)}${day.day === selectedDay ? ' selected' : ''}"
          onclick="selectExpenseHeatmapDay(${day.day})"
          title="Dia ${day.day}: ${formatCurrency(day.total)}"
          aria-label="Dia ${day.day}, ${formatCurrency(day.total)} em despesas"
        >${day.day}</button>
      `).join('')}
    </div>
    <div class="heatmap-detail">
      <div class="heatmap-detail-top">
        <div class="day-head-info">
          <span class="day-head-title">Dia ${selectedDay} • ${WEEKDAY_FULL[selectedDow].toUpperCase()}</span>
          <small class="day-head-count">${txCount} ${txCount === 1 ? 'transação' : 'transações'}</small>
        </div>
        <strong>${formatCurrency(selected.total)}</strong>
      </div>
      ${badgeHtml}
      ${biggest ? `
        <div class="heatmap-highlight">
          <small>Maior compra do dia</small>
          <div class="heatmap-highlight-row">
            <span class="day-ico">${CATEGORY_ICONS[biggest.cat] || '💸'}</span>
            <div>
              <strong>${escapeHtml(biggest.desc)}</strong>
              <small>${escapeHtml(biggest.cat || 'Outros')}</small>
            </div>
            <b>${formatCurrency(biggest.val)}</b>
          </div>
        </div>
        ${compositionHtml}
        <div class="heatmap-list">
          <span class="day-section-title">Transações</span>
          ${selectedExpenses.map((transaction, i) => `
            <div class="heatmap-list-row">
              <span class="day-ico">${CATEGORY_ICONS[transaction.cat] || '💸'}</span>
              <div>
                <strong>${escapeHtml(transaction.desc)}</strong>
                <small>${escapeHtml(transaction.cat || 'Outros')} · ${formatDateTime(transaction.date)}</small>
              </div>
              <b>${formatCurrency(transaction.val)}</b>
            </div>
          `).join('')}
        </div>
      ` : '<div class="heatmap-empty">Nenhuma despesa registrada nesse dia.</div>'}
    </div>
    </div>
    </div>
  `;
}

/** Clique numa barra: mostra valor exato num texto dinâmico abaixo do gráfico. */
window.selectChartBar = function (bar) {
  const wrap = bar.closest('.fin-bars');
  if (!wrap) return;
  const readout = wrap.parentElement.querySelector('.fin-bar-readout');
  const wasActive = bar.classList.contains('active');
  wrap.querySelectorAll('.fin-bar.active').forEach((b) => b.classList.remove('active'));
  if (wasActive) {
    if (readout) readout.classList.remove('show');
    return;
  }
  bar.classList.add('active');
  if (!readout) return;
  const tone = bar.dataset.tone ? ` ${bar.dataset.tone}` : '';
  readout.innerHTML = `
    <span class="fbr-label">${bar.dataset.label || ''}</span>
    <span class="fbr-value${tone}">${bar.dataset.value || ''}</span>`;
  readout.classList.add('show');
};

const BAR_KEY = "if(event.key==='Enter'||event.key===' '){event.preventDefault();selectChartBar(this)}";
const BAR_KEY_SIXM = "if(event.key==='Enter'||event.key===' '){event.preventDefault();selectSixMonthBar(this)}";

/** Clique numa barra do gráfico de 6 meses (receita/despesa) -> valor exato. */
window.selectSixMonthBar = function (bar) {
  const card = bar.closest('[data-sixmonth]');
  if (!card) return;
  const readout = card.querySelector('.fin-bar-readout');
  const active  = card.querySelector('.sixm-bar.active');
  if (active) active.classList.remove('active');
  if (active === bar) {
    if (readout) readout.classList.remove('show');
    return;
  }
  bar.classList.add('active');
  if (!readout) return;
  readout.innerHTML = `
    <span class="fbr-label">${bar.dataset.label || ''}</span>
    <span class="fbr-value ${bar.dataset.tone || ''}">${bar.dataset.value || ''}</span>`;
  readout.classList.add('show');
};

// ─── Gráfico: Gasto médio por dia da semana ──────────────────────────────────

const WEEKDAY_LETTER = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const WEEKDAY_FULL   = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
// "aos domingos/sábados" (masc.) · "às segundas..." (fem., dia de feira)
const WEEKDAY_PHRASE = [
  'aos domingos', 'às segundas', 'às terças', 'às quartas',
  'às quintas', 'às sextas', 'aos sábados',
];

function renderWeekdayChart(containerId, monthlyTransactions) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const expenses = monthlyTransactions.filter((t) => t.type === 'expense');
  const daysInMonth = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();

  // Ocorrências de cada dia da semana no mês (p/ tirar a média por ocorrência)
  const occurrences = [0, 0, 0, 0, 0, 0, 0];
  for (let d = 1; d <= daysInMonth; d++) {
    occurrences[new Date(state.currentYear, state.currentMonth, d).getDay()]++;
  }

  const totals = [0, 0, 0, 0, 0, 0, 0];
  expenses.forEach((t) => { totals[new Date(t.date).getDay()] += Number(t.val) || 0; });

  const averages = totals.map((sum, i) => (occurrences[i] ? sum / occurrences[i] : 0));
  const maxAvg   = Math.max(...averages, 0);
  const peak     = maxAvg > 0 ? averages.indexOf(maxAvg) : -1;

  const bars = averages.map((avg, i) => {
    const pct = maxAvg ? Math.max(4, Math.round((avg / maxAvg) * 100)) : 0;
    return `
      <div class="fin-bar${i === peak ? ' is-peak' : ''}" role="button" tabindex="0"
           data-label="${WEEKDAY_FULL[i]}" data-value="${formatCurrency(avg)} em média" data-tone="expense"
           onclick="selectChartBar(this)" onkeydown="${BAR_KEY}"
           title="${WEEKDAY_FULL[i]}: ${formatCurrency(avg)} em média">
        <div class="fin-bar-track"><div class="fin-bar-fill" style="height:${pct}%"></div></div>
        <span class="fin-bar-label">${WEEKDAY_LETTER[i]}</span>
      </div>`;
  }).join('');

  const note = peak >= 0
    ? `Você gasta mais <strong>${WEEKDAY_PHRASE[peak]}</strong>`
    : 'Sem despesas neste mês';

  container.innerHTML = `
    <div class="fin-chart-head">
      <div><span>Comportamento</span><h3>Gasto médio por dia</h3></div>
    </div>
    <p class="fin-chart-note">${note}</p>
    <div class="fin-bars fin-bars-7">${bars}</div>
    <div class="fin-bar-readout" aria-live="polite"></div>`;
}

// ─── Gráfico: Tendência de despesas dos últimos 6 meses ───────────────────────

function renderMonthlyTrend(containerId, allTransactions) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const buckets = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(state.currentYear, state.currentMonth - i, 1);
    buckets.push({ y: d.getFullYear(), m: d.getMonth(), label: MONTHS[d.getMonth()].slice(0, 3), expense: 0 });
  }
  const idx = new Map(buckets.map((b, i) => [`${b.y}-${b.m}`, i]));

  allTransactions.forEach((t) => {
    if (t.type !== 'expense') return;
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (idx.has(key)) buckets[idx.get(key)].expense += Number(t.val) || 0;
  });

  const values  = buckets.map((b) => b.expense);
  const maxVal  = Math.max(...values, 0);
  const current = values[values.length - 1];
  const average = values.reduce((s, v) => s + v, 0) / buckets.length;

  let note;
  if (maxVal === 0) {
    note = 'Sem despesas nos últimos meses';
  } else if (current < average) {
    note = 'Você gastou <strong>menos</strong> que a média neste mês';
  } else if (current > average) {
    note = 'Você gastou <strong>mais</strong> que a média neste mês';
  } else {
    note = 'Gasto em linha com a média';
  }

  const bars = buckets.map((b, i) => {
    const pct   = maxVal ? Math.max(4, Math.round((b.expense / maxVal) * 100)) : 0;
    const isCur = i === buckets.length - 1;
    return `
      <div class="fin-bar${isCur ? ' is-peak' : ''}" role="button" tabindex="0"
           data-label="${MONTHS[b.m]} ${b.y}" data-value="${formatCurrency(b.expense)}" data-tone="expense"
           onclick="selectChartBar(this)" onkeydown="${BAR_KEY}"
           title="${b.label}: ${formatCurrency(b.expense)}">
        <div class="fin-bar-cap">${b.expense > 0 ? formatCompactCurrency(b.expense) : ''}</div>
        <div class="fin-bar-track"><div class="fin-bar-fill" style="height:${pct}%"></div></div>
        <span class="fin-bar-label">${b.label}</span>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="fin-chart-head">
      <div><span>Tendência</span><h3>Últimos 6 meses</h3></div>
      <div class="fin-chart-avg"><small>Média/mês</small><strong>${formatCompactCurrency(average)}</strong></div>
    </div>
    <p class="fin-chart-note">${note}</p>
    <div class="fin-bars fin-bars-6">${bars}</div>
    <div class="fin-bar-readout" aria-live="polite"></div>`;
}

function getHeatmapTone(total, maxTotal) {
  if (!total || !maxTotal) return 'level-0';
  const intensity = total / maxTotal;
  if (intensity <= 0.25) return 'level-1';
  if (intensity <= 0.5) return 'level-2';
  if (intensity <= 0.75) return 'level-3';
  return 'level-4';
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
    const color = getDonutColor(cat, i, isIncome);
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
            const color = getDonutColor(cat, i, isIncome);
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

function getDonutColor(category, index, isIncome) {
  if (isIncome) return INCOME_PALETTE[index % INCOME_PALETTE.length];
  return EXPENSE_PALETTE[index % EXPENSE_PALETTE.length] || CATEGORY_COLORS[category] || '#71717a';
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
