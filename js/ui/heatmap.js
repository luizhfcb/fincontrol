// Mapa de calor de despesas por dia do mês + painel de detalhe do dia
// selecionado (maior compra, composição, lista de transações).
import { CATEGORY_ICONS } from '../core/constants.js';
import { state } from '../core/state.js';
import { formatCurrency, getMonthlyTransactions } from '../core/utils.js';
import { COMPO_PALETTE, escapeHtml, formatDateTime, WEEKDAY_FULL } from './ui-helpers.js';

export function selectExpenseHeatmapDay(day) {
  state.heatmapSelectedDay = Number(day) || 1;
  const monthlyTransactions = getMonthlyTransactions();
  renderExpenseHeatmap('mExpenseHeatmap', monthlyTransactions);
  renderExpenseHeatmap('dExpenseHeatmap', monthlyTransactions);
}

export function renderExpenseHeatmap(containerId, transactions) {
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
  // Distribuição dos dias COM gasto (ordenada) para tonalização por quantil.
  const sortedPositives = days.map((day) => day.total).filter((v) => v > 0).sort((a, b) => a - b);
  const selectedDay = Math.min(
    daysInMonth,
    Math.max(1, Number(state.heatmapSelectedDay) || new Date().getDate()),
  );
  state.heatmapSelectedDay = selectedDay;
  const selected = days[selectedDay - 1];
  const selectedExpenses = [...selected.transactions].sort((a, b) => b.val - a.val);
  const biggest = selectedExpenses[0];

  // ── Métricas do dia (estilo "Zap Gastos") ──────────────────────────────
  const selectedDow = new Date(state.currentYear, state.currentMonth, selectedDay).getDay();
  const activeDays   = days.filter((d) => d.total > 0).length;
  const dailyAvg     = activeDays ? totalMonth / activeDays : 0;
  const multiplier   = dailyAvg ? selected.total / dailyAvg : 0;
  const txCount      = selected.transactions.length;

  // ── Insight de padrão: dia da semana que concentra os gastos ──────────────
  let insightHtml = '';
  if (totalMonth > 0 && activeDays >= 2) {
    const weekdayTotals = Array(7).fill(0);
    days.forEach((d) => {
      if (d.total <= 0) return;
      const dow = new Date(state.currentYear, state.currentMonth, d.day).getDay();
      weekdayTotals[dow] += d.total;
    });
    let topDow = 0;
    for (let i = 1; i < 7; i += 1) {
      if (weekdayTotals[i] > weekdayTotals[topDow]) topDow = i;
    }
    if (weekdayTotals[topDow] > 0) {
      const share = Math.round((weekdayTotals[topDow] / totalMonth) * 100);
      insightHtml = `
        <div class="heatmap-insight">
          <span class="hi-ico" aria-hidden="true">
            <svg viewBox="0 0 24 24"><polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/></svg>
          </span>
          <span class="hi-text"><strong>${WEEKDAY_FULL[topDow]}</strong> concentra seus gastos — ${formatCurrency(weekdayTotals[topDow])} <em>(${share}% do mês)</em></span>
        </div>`;
    }
  }

  // Composição: fatia de cada despesa no total do dia (cores distintas)
  const compo = selected.total > 0
    ? selectedExpenses.map((t, i) => ({
        t,
        pct: (t.val / selected.total) * 100,
        color: COMPO_PALETTE[i % COMPO_PALETTE.length],
      }))
    : [];

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
    ${insightHtml}
    <div class="heatmap-weekdays" aria-hidden="true">
      <span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span>
    </div>
    <div class="heatmap-grid">
      ${Array.from({ length: firstWeekday }, () => '<span class="heatmap-day-spacer" aria-hidden="true"></span>').join('')}
      ${days.map((day) => `
        <button
          class="heatmap-day ${getHeatmapTone(day.total, sortedPositives)}${day.day === selectedDay ? ' selected' : ''}"
          onclick="selectExpenseHeatmapDay(${day.day})"
          title="Dia ${day.day}: ${formatCurrency(day.total)}"
          aria-label="Dia ${day.day}, ${formatCurrency(day.total)} em despesas"
        >${day.day}</button>
      `).join('')}
    </div>
    <div class="heatmap-scale">
      <span>Menos</span>
      <div class="heatmap-scale-bar"></div>
      <span>Mais</span>
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

// Tonalização por QUANTIL: distribui os dias com gasto em 4 faixas de
// população parecida, em vez de razão linear ao pico. Assim um único dia caro
// não achata todo o resto. Dia sem gasto (total 0) fica neutro (level-0).
function getHeatmapTone(total, sortedPositives) {
  if (!total || !sortedPositives.length) return 'level-0';
  // Posição do valor na distribuição dos dias com gasto (0 < ratio <= 1).
  let rank = 0;
  for (const value of sortedPositives) {
    if (value <= total) rank += 1;
    else break;
  }
  const ratio = rank / sortedPositives.length;
  if (ratio <= 0.25) return 'level-1';
  if (ratio <= 0.5) return 'level-2';
  if (ratio <= 0.75) return 'level-3';
  return 'level-4';
}
