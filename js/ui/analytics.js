import { CATEGORY_COLORS, MONTHS } from '../core/constants.js';
import { state } from '../core/state.js';
import { formatCurrency, setText } from '../core/utils.js';
import { assignDistinctDonutColors } from './chart-colors.mjs';
import { escapeHtml } from './ui-helpers.js';

const PERIODS = new Set(['week', 'month', 'year', 'all']);
const ANALYTICS_WEEKDAYS = [
  { label: 'Seg', fullLabel: 'Segunda-feira' },
  { label: 'Ter', fullLabel: 'Terça-feira' },
  { label: 'Qua', fullLabel: 'Quarta-feira' },
  { label: 'Qui', fullLabel: 'Quinta-feira' },
  { label: 'Sex', fullLabel: 'Sexta-feira' },
  { label: 'Sáb', fullLabel: 'Sábado' },
  { label: 'Dom', fullLabel: 'Domingo' },
];
const BAR_KEY = "if(event.key==='Enter'||event.key===' '){event.preventDefault();selectChartBar(this)}";

function addDays(date, amount) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function selectedMonthAnchor() {
  const today = new Date();
  const lastDay = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
  return new Date(state.currentYear, state.currentMonth, Math.min(today.getDate(), lastDay));
}

function buildPeriod(period) {
  if (period === 'week') {
    const anchor = selectedMonthAnchor();
    const mondayOffset = (anchor.getDay() + 6) % 7;
    const start = addDays(anchor, -mondayOffset);
    const end = addDays(start, 7);
    const previousStart = addDays(start, -7);
    return {
      start,
      end,
      previousStart,
      previousEnd: start,
      heading: 'Total gasto nesta semana',
      previousLabel: 'semana anterior',
    };
  }

  if (period === 'all') {
    return {
      heading: 'Total gasto geral',
      previousLabel: '',
    };
  }

  if (period === 'year') {
    const start = new Date(state.currentYear, 0, 1);
    const end = new Date(state.currentYear + 1, 0, 1);
    return {
      start,
      end,
      previousStart: new Date(state.currentYear - 1, 0, 1),
      previousEnd: start,
      heading: `Total gasto em ${state.currentYear}`,
      previousLabel: String(state.currentYear - 1),
    };
  }

  const start = new Date(state.currentYear, state.currentMonth, 1);
  const end = new Date(state.currentYear, state.currentMonth + 1, 1);
  const previousStart = new Date(state.currentYear, state.currentMonth - 1, 1);
  return {
    start,
    end,
    previousStart,
    previousEnd: start,
    heading: 'Total gasto neste mês',
    previousLabel: MONTHS[previousStart.getMonth()],
  };
}

function inRange(transaction, start, end) {
  const date = new Date(transaction.date);
  return Number.isFinite(date.getTime()) && date >= start && date < end;
}

export function selectAnalyticsPeriodTransactions(
  allTransactions,
  period,
  definition,
  currentMonth = state.currentMonth,
  currentYear = state.currentYear,
) {
  if (period === 'all') {
    return {
      currentTransactions: [...allTransactions],
      previousTransactions: [],
    };
  }

  if (period === 'month') {
    const previousDate = new Date(currentYear, currentMonth - 1, 1);
    return {
      currentTransactions: allTransactions.filter(
        (transaction) => transaction.month === currentMonth && transaction.year === currentYear,
      ),
      previousTransactions: allTransactions.filter(
        (transaction) => transaction.month === previousDate.getMonth()
          && transaction.year === previousDate.getFullYear(),
      ),
    };
  }

  if (period === 'year') {
    return {
      currentTransactions: allTransactions.filter((transaction) => transaction.year === currentYear),
      previousTransactions: allTransactions.filter((transaction) => transaction.year === currentYear - 1),
    };
  }

  return {
    currentTransactions: allTransactions.filter(
      (transaction) => inRange(transaction, definition.start, definition.end),
    ),
    previousTransactions: allTransactions.filter(
      (transaction) => inRange(transaction, definition.previousStart, definition.previousEnd),
    ),
  };
}

function totals(transactions) {
  const income = transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + (Number(transaction.val) || 0), 0);
  const expense = transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + (Number(transaction.val) || 0), 0);
  return { income, expense };
}

function renderPeriodFilter(period) {
  document.querySelectorAll('#maPeriodFilter [data-period]').forEach((button) => {
    const active = button.dataset.period === period;
    button.classList.toggle('active', active);
    button.setAttribute('aria-checked', String(active));
    button.tabIndex = active ? 0 : -1;
  });
}

function renderSummary(currentTransactions) {
  const current = totals(currentTransactions);
  setText('maIncomeTotal', formatCurrency(current.income));
  setText('maOutflowTotal', formatCurrency(current.expense));
}

export function buildWeekdaySpending(transactions) {
  const values = Array(ANALYTICS_WEEKDAYS.length).fill(0);

  transactions
    .filter((transaction) => transaction.type === 'expense')
    .forEach((transaction) => {
      const date = new Date(transaction.date);
      if (!Number.isFinite(date.getTime())) return;
      const mondayFirstIndex = (date.getDay() + 6) % 7;
      values[mondayFirstIndex] += Number(transaction.val) || 0;
    });

  return ANALYTICS_WEEKDAYS.map((weekday, index) => ({
    ...weekday,
    value: values[index],
  }));
}

function renderDailyChart(period, currentTransactions) {
  const container = document.getElementById('maDailyChart');
  if (!container) return;

  const buckets = buildWeekdaySpending(currentTransactions);
  const max = Math.max(...buckets.map((bucket) => bucket.value), 0);
  const peakIndex = max > 0 ? buckets.findIndex((bucket) => bucket.value === max) : -1;
  const bars = buckets.map((bucket, index) => {
    const height = max > 0 ? Math.max(6, Math.round((bucket.value / max) * 100)) : 0;
    const ghostHeight = height > 0 ? Math.min(100, height + 16) : 18;
    const barClasses = [index === peakIndex ? 'is-peak' : '', bucket.value <= 0 ? 'is-empty' : '']
      .filter(Boolean)
      .join(' ');
    return `
      <div class="fin-bar${barClasses ? ` ${barClasses}` : ''}" role="button" tabindex="0"
           data-label="${escapeHtml(bucket.fullLabel)}" data-value="${formatCurrency(bucket.value)}" data-tone="expense"
           onclick="selectChartBar(this)" onkeydown="${BAR_KEY}" title="${escapeHtml(bucket.fullLabel)}: ${formatCurrency(bucket.value)}">
        <div class="fin-bar-track" style="--ghost-height:${ghostHeight}%"><div class="fin-bar-fill" style="height:${height}%"></div></div>
        <span class="fin-bar-label">${escapeHtml(bucket.label)}</span>
      </div>`;
  }).join('');

  container.dataset.period = period;
  container.innerHTML = `
    <div class="analytics-chart-head">
      <h3>Gastos por dia</h3>
      <span class="analytics-chart-current"><i aria-hidden="true"></i>Atual</span>
    </div>
    <div class="analytics-daily-plot"><div class="analytics-daily-scroll"><div class="fin-bars analytics-daily-bars">${bars}</div></div></div>
    <div class="fin-bar-readout" aria-live="polite"></div>`;
}

function renderBreakdown(currentTransactions) {
  const container = document.getElementById('maBreakdown');
  if (!container) return;

  const categoryMap = new Map();
  currentTransactions
    .filter((transaction) => transaction.type === 'expense')
    .forEach((transaction) => {
      const category = transaction.cat || 'Outros';
      categoryMap.set(category, (categoryMap.get(category) || 0) + (Number(transaction.val) || 0));
    });
  const categories = [...categoryMap.entries()].sort((a, b) => b[1] - a[1]);
  const total = categories.reduce((sum, [, value]) => sum + value, 0);
  if (!categories.length || total <= 0) {
    container.innerHTML = '<div class="empty">Sem despesas no período</div>';
    return;
  }

  const colors = assignDistinctDonutColors(
    categories.map(([category]) => category),
    false,
    CATEGORY_COLORS,
  );
  container.innerHTML = categories.map(([category, value], index) => {
    const percent = (value / total) * 100;
    const width = percent;
    return `
      <div class="breakdown-row">
        <div class="breakdown-main">
          <div class="breakdown-copy">
            <strong><i class="breakdown-dot" style="background:${colors[index]}" aria-hidden="true"></i>${escapeHtml(category)}</strong>
            <span><b class="priv">${formatCurrency(value)}</b><em>${percent.toFixed(0)}%</em></span>
          </div>
          <div class="breakdown-track"><span style="width:${width.toFixed(1)}%;background:${colors[index]}"></span></div>
        </div>
      </div>`;
  }).join('');
}

export function renderAnalytics(allTransactions = state.transactions) {
  if (!document.getElementById('mp-analytics')) return;
  const period = PERIODS.has(state.analyticsPeriod) ? state.analyticsPeriod : 'month';
  const definition = buildPeriod(period);
  const { currentTransactions } = selectAnalyticsPeriodTransactions(
    allTransactions,
    period,
    definition,
  );

  renderPeriodFilter(period);
  renderSummary(currentTransactions);
  renderDailyChart(period, currentTransactions);
  renderBreakdown(currentTransactions);
}

export function setAnalyticsPeriod(period) {
  if (!PERIODS.has(period)) return;
  state.analyticsPeriod = period;
  renderAnalytics(state.transactions);
}

export function handleAnalyticsPeriodKey(event) {
  const directions = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
  const periods = [...PERIODS];
  let nextPeriod;

  if (event.key === 'Home') nextPeriod = periods[0];
  else if (event.key === 'End') nextPeriod = periods[periods.length - 1];
  else if (directions[event.key]) {
    const currentPeriod = event.currentTarget?.dataset.period || state.analyticsPeriod;
    const currentIndex = Math.max(0, periods.indexOf(currentPeriod));
    nextPeriod = periods[(currentIndex + directions[event.key] + periods.length) % periods.length];
  }

  if (!nextPeriod) return;
  event.preventDefault();
  setAnalyticsPeriod(nextPeriod);
  document.querySelector(`#maPeriodFilter [data-period="${nextPeriod}"]`)?.focus();
}
