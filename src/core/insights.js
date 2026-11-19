// Regras puras dos gráficos e insights (portadas de js/ui/charts.js,
// heatmap.js e donut-grouping.mjs do app original). Sem DOM/React.

export const WEEKDAY_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEKDAY_PHRASE = [
  'aos domingos', 'às segundas', 'às terças', 'às quartas',
  'às quintas', 'às sextas', 'aos sábados',
];

// Cores vívidas para composição do dia — legíveis em tema claro e escuro.
export const COMPO_PALETTE = [
  '#29D6FF', '#FF6B6B', '#FFD166', '#06D6A0',
  '#A78BFA', '#F78C6B', '#4ADE80', '#F472B6',
  '#38BDF8', '#FBBF24', '#22D3EE', '#FB7185',
];

const num = (v) => Number(v) || 0;
const isExpense = (t) => t.type === 'expense';

/**
 * Reduz as categorias a `limit` fatias. O excedente vira uma fatia agregada
 * "+N categorias" (nunca "Outros", que é uma categoria real).
 * @param {Array<{cat:string,value:number}>} rows ordenadas do maior p/ menor
 */
export function compactDonutCategories(rows, limit = 6) {
  const positive = rows.filter((r) => num(r.value) > 0);
  const total = positive.reduce((s, r) => s + r.value, 0);
  const withPct = (r) => ({ ...r, percent: total ? (r.value / total) * 100 : 0 });
  if (positive.length <= limit) return positive.map(withPct);

  const visible = positive.slice(0, limit - 1);
  const rest = positive.slice(limit - 1);
  const value = rest.reduce((s, r) => s + r.value, 0);
  return [
    ...visible.map(withPct),
    withPct({ cat: `+${rest.length} categorias`, value, grouped: rest.map((r) => r.cat) }),
  ];
}

/** Tonalização por quantil (0 = sem gasto, 1..4 = faixas de população parecida). */
export function heatmapTone(total, sortedPositives) {
  if (!total || !sortedPositives.length) return 0;
  let rank = 0;
  for (const value of sortedPositives) {
    if (value <= total) rank += 1;
    else break;
  }
  const ratio = rank / sortedPositives.length;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

/** Mapa de calor de despesas por dia do mês. */
export function buildHeatmap(transactions, month, year, now = new Date()) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    weekday: new Date(year, month, i + 1).getDay(),
    total: 0,
    transactions: [],
  }));

  for (const t of transactions) {
    if (!isExpense(t)) continue;
    const d = new Date(t.date);
    if (d.getMonth() !== month || d.getFullYear() !== year) continue;
    const slot = days[d.getDate() - 1];
    if (!slot) continue;
    slot.total += num(t.val);
    slot.transactions.push(t);
  }

  const sortedPositives = days.map((d) => d.total).filter((v) => v > 0).sort((a, b) => a - b);
  for (const d of days) d.tone = heatmapTone(d.total, sortedPositives);

  const totalMonth = days.reduce((s, d) => s + d.total, 0);
  const activeDays = sortedPositives.length;
  const dailyAvg = activeDays ? totalMonth / activeDays : 0;

  let insight = null;
  if (totalMonth > 0 && activeDays >= 2) {
    const byWeekday = Array(7).fill(0);
    for (const d of days) byWeekday[d.weekday] += d.total;
    let top = 0;
    for (let i = 1; i < 7; i += 1) if (byWeekday[i] > byWeekday[top]) top = i;
    insight = {
      weekday: top,
      label: WEEKDAY_FULL[top],
      total: byWeekday[top],
      share: Math.round((byWeekday[top] / totalMonth) * 100),
    };
  }

  const isCurrentMonth = now.getMonth() === month && now.getFullYear() === year;
  return {
    days, daysInMonth, firstWeekday, totalMonth, activeDays, dailyAvg, insight,
    isCurrentMonth, today: now.getDate(),
  };
}

/** Detalhe de um dia do mapa: maior compra, composição e multiplicador do dia típico. */
export function buildDayDetail(heatmap, day) {
  const safe = Math.min(heatmap.daysInMonth, Math.max(1, Number(day) || 1));
  const slot = heatmap.days[safe - 1];
  const items = [...slot.transactions].sort((a, b) => b.val - a.val);
  return {
    day: safe,
    weekday: slot.weekday,
    weekdayLabel: WEEKDAY_FULL[slot.weekday],
    total: slot.total,
    count: items.length,
    items,
    biggest: items[0] || null,
    multiplier: heatmap.dailyAvg ? slot.total / heatmap.dailyAvg : 0,
    composition: slot.total > 0
      ? items.map((t, i) => ({ tx: t, pct: (t.val / slot.total) * 100, color: COMPO_PALETTE[i % COMPO_PALETTE.length] }))
      : [],
  };
}

/** Gasto médio por ocorrência de cada dia da semana no mês (segunda primeiro). */
export function buildWeekdayAverage(transactions, month, year) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const occurrences = Array(7).fill(0);
  for (let d = 1; d <= daysInMonth; d += 1) occurrences[new Date(year, month, d).getDay()] += 1;

  const totals = Array(7).fill(0);
  for (const t of transactions) {
    if (!isExpense(t)) continue;
    const d = new Date(t.date);
    if (d.getMonth() !== month || d.getFullYear() !== year) continue;
    totals[d.getDay()] += num(t.val);
  }

  const order = [1, 2, 3, 4, 5, 6, 0];
  const rows = order.map((dow) => ({
    dow,
    label: WEEKDAY_SHORT[dow],
    fullLabel: WEEKDAY_FULL[dow],
    total: totals[dow],
    avg: occurrences[dow] ? totals[dow] / occurrences[dow] : 0,
  }));
  const max = Math.max(...rows.map((r) => r.avg), 0);
  const peak = max > 0 ? rows.find((r) => r.avg === max) : null;
  return { rows, peak, phrase: peak ? WEEKDAY_PHRASE[peak.dow] : null };
}

/** Comparação do mês atual com a média dos meses da tendência. */
export function trendInsight(trend, key = 'expense') {
  const values = trend.map((t) => num(t[key]));
  if (!values.length || Math.max(...values) === 0) return { average: 0, current: 0, status: 'none' };
  const average = values.reduce((s, v) => s + v, 0) / values.length;
  const current = values[values.length - 1];
  const status = current < average ? 'below' : current > average ? 'above' : 'equal';
  return { average, current, status };
}

/** Mini estatísticas do mês (dias ativos, média diária, maior gasto, registros). */
export function buildMonthStats(monthlyTransactions) {
  const expenses = monthlyTransactions.filter(isExpense);
  const expense = expenses.reduce((s, t) => s + num(t.val), 0);
  const activeDays = new Set(monthlyTransactions.map((t) => new Date(t.date).toDateString())).size;
  const biggest = [...expenses].sort((a, b) => b.val - a.val)[0] || null;
  return {
    count: monthlyTransactions.length,
    activeDays,
    dailyAverage: activeDays ? expense / activeDays : 0,
    biggest,
  };
}

/** Gasto diário dentro de um intervalo [start, end) — barras do período. */
export function buildDailySeries(transactions, start, end) {
  const out = [];
  const index = new Map();
  for (let d = new Date(start); d < end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    const key = d.toDateString();
    index.set(key, out.length);
    out.push({ date: new Date(d), label: String(d.getDate()), value: 0 });
  }
  for (const t of transactions) {
    if (!isExpense(t)) continue;
    const i = index.get(new Date(t.date).toDateString());
    if (i != null) out[i].value += num(t.val);
  }
  return out;
}

/** Agrupa lançamentos com a mesma descrição (histórico por descrição). */
export function buildDescriptionHistory(transactions, desc) {
  const items = transactions
    .filter((t) => t.desc === desc)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const income = items.filter((t) => t.type === 'income').reduce((s, t) => s + num(t.val), 0);
  const expense = items.filter(isExpense).reduce((s, t) => s + num(t.val), 0);
  return { items, income, expense, net: income - expense };
}
