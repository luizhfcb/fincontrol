import { MONTHS } from './constants.js';
import { toLocalDateInputValue } from './local-date.mjs';
import { parsePtBrNumber } from './parse-number.mjs';

export const PERIODS = ['week', 'month', 'year', 'all'];
export const PERIOD_LABELS = { week: 'Semana', month: 'Mês', year: 'Ano', all: 'Tudo' };

export const WEEKDAYS = [
  { label: 'Seg', fullLabel: 'Segunda-feira' },
  { label: 'Ter', fullLabel: 'Terça-feira' },
  { label: 'Qua', fullLabel: 'Quarta-feira' },
  { label: 'Qui', fullLabel: 'Quinta-feira' },
  { label: 'Sex', fullLabel: 'Sexta-feira' },
  { label: 'Sáb', fullLabel: 'Sábado' },
  { label: 'Dom', fullLabel: 'Domingo' },
];

const addDays = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
const num = (v) => Number(v) || 0;

export function totals(transactions) {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (t.type === 'income') income += num(t.val);
    else if (t.type === 'expense') expense += num(t.val);
  }
  return { income, expense, balance: income - expense };
}

export function buildPeriod(period, month, year, today = new Date()) {
  if (period === 'all') return { heading: 'Total gasto geral', previousLabel: '' };

  if (period === 'week') {
    const lastDay = new Date(year, month + 1, 0).getDate();
    const anchor = new Date(year, month, Math.min(today.getDate(), lastDay));
    const start = addDays(anchor, -((anchor.getDay() + 6) % 7));
    return {
      start,
      end: addDays(start, 7),
      previousStart: addDays(start, -7),
      previousEnd: start,
      heading: 'Total gasto nesta semana',
      previousLabel: 'semana anterior',
    };
  }

  if (period === 'year') {
    const start = new Date(year, 0, 1);
    return {
      start,
      end: new Date(year + 1, 0, 1),
      previousStart: new Date(year - 1, 0, 1),
      previousEnd: start,
      heading: `Total gasto em ${year}`,
      previousLabel: String(year - 1),
    };
  }

  const start = new Date(year, month, 1);
  const previousStart = new Date(year, month - 1, 1);
  return {
    start,
    end: new Date(year, month + 1, 1),
    previousStart,
    previousEnd: start,
    heading: 'Total gasto neste mês',
    previousLabel: MONTHS[previousStart.getMonth()],
  };
}

const inRange = (t, start, end) => {
  const d = new Date(t.date);
  return Number.isFinite(d.getTime()) && d >= start && d < end;
};

export function selectPeriodTransactions(all, period, definition, month, year) {
  if (period === 'all') return { current: [...all], previous: [] };

  if (period === 'month') {
    const prev = new Date(year, month - 1, 1);
    return {
      current: all.filter((t) => t.month === month && t.year === year),
      previous: all.filter((t) => t.month === prev.getMonth() && t.year === prev.getFullYear()),
    };
  }

  if (period === 'year') {
    return {
      current: all.filter((t) => t.year === year),
      previous: all.filter((t) => t.year === year - 1),
    };
  }

  return {
    current: all.filter((t) => inRange(t, definition.start, definition.end)),
    previous: all.filter((t) => inRange(t, definition.previousStart, definition.previousEnd)),
  };
}

export function buildWeekdaySpending(transactions) {
  const values = Array(7).fill(0);
  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    const d = new Date(t.date);
    if (!Number.isFinite(d.getTime())) continue;
    values[(d.getDay() + 6) % 7] += num(t.val);
  }
  return WEEKDAYS.map((w, i) => ({ ...w, value: values[i] }));
}

/** [{ cat, value, percent }] ordenado do maior para o menor. */
export function buildCategoryBreakdown(transactions, type = 'expense') {
  const map = new Map();
  for (const t of transactions) {
    if (t.type !== type) continue;
    const cat = t.cat || 'Outros';
    map.set(cat, (map.get(cat) || 0) + num(t.val));
  }
  const rows = [...map.entries()].sort((a, b) => b[1] - a[1]);
  const total = rows.reduce((s, [, v]) => s + v, 0);
  return rows.map(([cat, value]) => ({ cat, value, percent: total ? (value / total) * 100 : 0 }));
}

export function buildMonthlyTrend(all, month, year, count = 6) {
  const out = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(year, month - i, 1);
    const txs = all.filter((t) => t.month === d.getMonth() && t.year === d.getFullYear());
    out.push({
      label: MONTHS[d.getMonth()].slice(0, 3),
      month: d.getMonth(),
      year: d.getFullYear(),
      ...totals(txs),
    });
  }
  return out;
}

export function niceCeil(value) {
  if (!(value > 0)) return 0;
  const power = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 5, 10]) if (value <= step * power) return step * power;
  return 10 * power;
}

export function filterTransactions(transactions, filters = {}) {
  const { query = '', type = 'all', cat = '', min, max, from, to } = filters;
  const q = query.trim().toLocaleLowerCase('pt-BR');
  const lo = min === '' || min == null ? null : parsePtBrNumber(min);
  const hi = max === '' || max == null ? null : parsePtBrNumber(max);

  return transactions.filter((t) => {
    if (type !== 'all' && t.type !== type) return false;
    if (cat && t.cat !== cat) return false;
    if (q && !String(t.desc || '').toLocaleLowerCase('pt-BR').includes(q)) return false;
    if (lo != null && Number.isFinite(lo) && t.val < lo) return false;
    if (hi != null && Number.isFinite(hi) && t.val > hi) return false;
    if (from || to) {
      const day = toLocalDateInputValue(t.date);
      if (from && day < from) return false;
      if (to && day > to) return false;
    }
    return true;
  });
}

export function groupByCategory(transactions) {
  const groups = new Map();
  for (const t of transactions) {
    const cat = t.cat || 'Outros';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(t);
  }
  return [...groups.entries()]
    .map(([cat, items]) => {
      const t = totals(items);
      return { cat, items, income: t.income, expense: t.expense, net: t.balance, total: t.income + t.expense };
    })
    .sort((a, b) => b.total - a.total);
}

export function buildLimitProgress(limits, monthlyTransactions) {
  const spentBy = new Map(buildCategoryBreakdown(monthlyTransactions).map((r) => [r.cat, r.value]));
  return limits.map((l) => {
    const spent = spentBy.get(l.category) || 0;
    const percent = l.limit > 0 ? (spent / l.limit) * 100 : 0;
    return { ...l, spent, percent, status: percent >= 100 ? 'over' : percent >= 80 ? 'warn' : 'ok' };
  });
}

export function goalProgress(goal, now = new Date()) {
  const percent = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
  const remaining = Math.max(0, goal.target - goal.saved);
  let monthlyNeeded = null;
  if (goal.deadline && remaining > 0) {
    const end = new Date(`${goal.deadline}T00:00:00`);
    const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
    monthlyNeeded = months > 0 ? remaining / months : remaining;
  }
  return { percent, remaining, monthlyNeeded, done: remaining === 0 };
}
