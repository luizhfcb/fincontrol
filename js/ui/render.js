// Orquestrador da UI: refreshUI() calcula métricas do dashboard e delega a
// renderização às views especializadas (tx-list, heatmap, charts, modules).
import { MONTHS } from '../core/constants.js';
import { buildDashboardComparison } from '../core/dashboard-comparison.mjs';
import { state } from '../core/state.js';
import { formatCompactCurrency, formatCurrency, getMonthlyTransactions, setText } from '../core/utils.js';
import { renderModules } from './modules.js';
import { renderExpenseHeatmap } from './heatmap.js';
import { renderTransactionsPage } from './tx-list.js';
import {
  renderDonutCharts,
  renderMonthlyTrend,
  renderSixMonthChart,
  renderWeekdayChart,
} from './charts.js';

// Re-export: consumidores externos (modules.js, main.js) seguem importando daqui.
export { escapeHtml } from './ui-helpers.js';
export { openTxHistory, closeTxHistory } from './tx-history.js';
export { selectExpenseHeatmapDay } from './heatmap.js';
export { setTxSearch, setTxFilter, setTxGrouped } from './tx-list.js';

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

  // ── Lógica de visão (Geral / Receitas / Despesas) ─────────────────────────
  const dashView = state.dashView || 'all';
  let heroValue, heroClass, balanceLabel, chartTxs, chartTotal, chartIsIncome, comparisonValue, previousHeroValue;

  if (dashView === 'income') {
    heroValue    = income;
    heroClass    = 'positive';
    balanceLabel = 'RECEITAS DO MÊS';
    chartTxs     = incomeTransactions;
    chartTotal   = income;
    chartIsIncome = true;
    comparisonValue = income;
    previousHeroValue = prevIncome;
  } else if (dashView === 'expense') {
    heroValue    = expense;
    heroClass    = 'negative';
    balanceLabel = 'DESPESAS DO MÊS';
    chartTxs     = expenseTransactions;
    chartTotal   = expense;
    chartIsIncome = false;
    comparisonValue = expense;
    previousHeroValue = prevExpense;
  } else {
    heroValue    = Math.abs(balance);
    heroClass    = balance >= 0 ? 'positive' : 'negative';
    balanceLabel = 'SALDO DO MÊS';
    chartTxs     = expenseTransactions;
    chartTotal   = expense;
    chartIsIncome = false;
    comparisonValue = balance;
    previousHeroValue = prevBalance;
  }

  // ── Atualiza métrica principal do dashboard ────────────────────────────────
  ['mBalance'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = formatCurrency(heroValue);
    el.className   = `big-val priv ${heroClass}`;
  });

  const desktopBalance = document.getElementById('dBalance');
  if (desktopBalance) {
    desktopBalance.textContent = formatCurrency(balance);
    desktopBalance.className = `val ${balance >= 0 ? 'positive' : 'negative'}`;
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
  setText('monthLabel', `${MONTHS[state.currentMonth]} ${state.currentYear}`);
  const comparison = buildDashboardComparison(comparisonValue, previousHeroValue, MONTHS[prevDate.getMonth()]);
  const badge = document.getElementById('mBalanceDelta');
  const comparisonLabel = document.getElementById('mBalanceComparison');
  if (badge) {
    badge.hidden = !comparison;
    if (comparison) {
      badge.textContent = comparison.deltaText;
      badge.className = `m-badge is-${comparison.tone}`;
    }
  }
  if (comparisonLabel) {
    comparisonLabel.hidden = !comparison;
    if (comparison) comparisonLabel.textContent = comparison.contextText;
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
