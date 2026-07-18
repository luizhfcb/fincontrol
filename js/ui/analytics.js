import { CATEGORY_COLORS, CATEGORY_ICONS, MONTHS } from '../core/constants.js';
import { state } from '../core/state.js';
import { formatCurrency, setText } from '../core/utils.js';
import { assignDistinctDonutColors } from './chart-colors.mjs';
import { renderEmptyState } from './empty-state.js';
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

function renderSummary(currentTransactions, previousTransactions, definition) {
  const current = totals(currentTransactions);
  const previous = totals(previousTransactions);
  setText('maIncomeTotal', formatCurrency(current.income));
  setText('maOutflowTotal', formatCurrency(current.expense));
  renderComparisonBadge('maIncomeBadge', current.income, previous.income, definition.previousLabel);
  renderComparisonBadge('maOutflowBadge', current.expense, previous.expense, definition.previousLabel);
}

/* Badge "↑ 12% vs Junho" — só com dados reais do período anterior. */
function renderComparisonBadge(id, currentValue, previousValue, previousLabel) {
  const badge = document.getElementById(id);
  if (!badge) return;
  if (!previousLabel || !(previousValue > 0)) {
    badge.hidden = true;
    return;
  }
  const change = ((currentValue - previousValue) / previousValue) * 100;
  const arrow = change >= 0 ? '↑' : '↓';
  badge.hidden = false;
  badge.innerHTML = `<b>${arrow} ${Math.abs(change).toFixed(0)}%</b>&nbsp;vs ${escapeHtml(previousLabel)}`;
}

/* Teto "bonito" para o eixo Y (1/2/5 × 10^n). */
function niceCeil(value) {
  if (!(value > 0)) return 0;
  const power = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 5, 10]) {
    if (value <= step * power) return step * power;
  }
  return 10 * power;
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

function renderDailyChart(period, currentTransactions, previousTransactions = []) {
  const container = document.getElementById('maDailyChart');
  if (!container) return;

  const buckets = buildWeekdaySpending(currentTransactions);
  const previousBuckets = buildWeekdaySpending(previousTransactions);
  const hasPrevious = previousBuckets.some((bucket) => bucket.value > 0);
  const rawMax = Math.max(
    ...buckets.map((bucket) => bucket.value),
    ...previousBuckets.map((bucket) => bucket.value),
    0,
  );
  const scaleMax = niceCeil(rawMax);
  const peak = Math.max(...buckets.map((bucket) => bucket.value), 0);
  const peakIndex = peak > 0 ? buckets.findIndex((bucket) => bucket.value === peak) : -1;
  const bars = buckets.map((bucket, index) => {
    const height = scaleMax > 0 ? Math.max(bucket.value > 0 ? 4 : 0, Math.round((bucket.value / scaleMax) * 100)) : 0;
    const ghostHeight = scaleMax > 0 ? Math.round((previousBuckets[index].value / scaleMax) * 100) : 0;
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

  const axis = scaleMax > 0
    ? `<div class="daily-axis" aria-hidden="true">${[1, 0.75, 0.5, 0.25, 0]
      .map((fraction) => `<span>${(scaleMax * fraction).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>`)
      .join('')}</div>`
    : '';

  container.dataset.period = period;
  container.innerHTML = `
    <div class="analytics-chart-head">
      <h3>Gastos por dia</h3>
      <span class="analytics-chart-legend">
        <span class="analytics-chart-current"><i aria-hidden="true"></i>Atual</span>
        ${hasPrevious ? '<span class="analytics-chart-prev"><i aria-hidden="true"></i>Anterior</span>' : ''}
      </span>
    </div>
    <div class="analytics-daily-plot${axis ? ' has-axis' : ''}">${axis}<div class="analytics-daily-scroll"><div class="fin-bars analytics-daily-bars">${bars}</div></div></div>
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
    container.innerHTML = renderEmptyState({
      icon: 'chart',
      title: 'Sem despesas no período',
      hint: 'Os gastos do período aparecem aqui por categoria.',
    });
    return;
  }

  const colors = assignDistinctDonutColors(
    categories.map(([category]) => category),
    false,
    CATEGORY_COLORS,
  );
  const VISIBLE_LIMIT = 4;
  const showAll = !!state.analyticsShowAllCats;
  const rows = categories.map(([category, value], index) => {
    const percent = (value / total) * 100;
    return `
      <div class="breakdown-row${index >= VISIBLE_LIMIT && !showAll ? ' is-hidden' : ''}">
        <span class="breakdown-icon" style="--category-color:${colors[index]}" aria-hidden="true">${CATEGORY_ICONS[category] || '💸'}</span>
        <div class="breakdown-main">
          <div class="breakdown-copy">
            <span class="breakdown-name"><strong>${escapeHtml(category)}</strong><small>${percent.toFixed(0)}% do total</small></span>
            <span class="breakdown-vals"><b class="priv">${formatCurrency(value)}</b><em style="color:${colors[index]}">${percent.toFixed(0)}%</em></span>
          </div>
          <div class="breakdown-track"><span style="width:${percent.toFixed(1)}%;background:${colors[index]}"></span></div>
        </div>
      </div>`;
  }).join('');
  const moreButton = categories.length > VISIBLE_LIMIT
    ? `<button type="button" class="breakdown-more" onclick="toggleAnalyticsCategories()">
        <span>${showAll ? 'Ver menos categorias' : 'Ver mais categorias'}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" style="transform:rotate(${showAll ? '-90' : '90'}deg)"><path d="M9 6l6 6-6 6"/></svg>
      </button>`
    : '';
  container.innerHTML = rows + moreButton;
}

export function toggleAnalyticsCategories() {
  state.analyticsShowAllCats = !state.analyticsShowAllCats;
  renderAnalytics(state.transactions);
}

export function renderAnalytics(allTransactions = state.transactions) {
  if (!document.getElementById('mp-analytics')) return;
  const period = PERIODS.has(state.analyticsPeriod) ? state.analyticsPeriod : 'month';
  const definition = buildPeriod(period);
  const { currentTransactions, previousTransactions } = selectAnalyticsPeriodTransactions(
    allTransactions,
    period,
    definition,
  );

  renderPeriodFilter(period);
  renderSummary(currentTransactions, previousTransactions, definition);
  renderDailyChart(period, currentTransactions, previousTransactions);
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
