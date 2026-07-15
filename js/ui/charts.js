// Gráficos do dashboard: donut por categoria, 6 meses (receita×despesa),
// tendência mensal de despesas e gasto médio por dia da semana.
import { CATEGORY_COLORS, MONTHS } from '../core/constants.js';
import { state } from '../core/state.js';
import { formatCompactCurrency, formatCurrency } from '../core/utils.js';
import { assignDistinctDonutColors } from './chart-colors.mjs';
import { escapeHtml, WEEKDAY_FULL } from './ui-helpers.js';

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

export function renderSixMonthChart(containerId, allTransactions) {
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

// ─── Gráfico: Gasto médio por dia da semana ──────────────────────────────────

const WEEKDAY_LETTER = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
// "aos domingos/sábados" (masc.) · "às segundas..." (fem., dia de feira)
const WEEKDAY_PHRASE = [
  'aos domingos', 'às segundas', 'às terças', 'às quartas',
  'às quintas', 'às sextas', 'aos sábados',
];

export function renderWeekdayChart(containerId, monthlyTransactions) {
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

export function renderMonthlyTrend(containerId, allTransactions) {
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

// ─── Gráfico Donut ────────────────────────────────────────────────────────────

export function renderDonutCharts(sortedCategories, totalValue, isIncome = false) {
  const markup = buildDonutMarkup(sortedCategories, totalValue, isIncome);
  const mobileChart  = document.getElementById('mBarChart');
  const desktopChart = document.getElementById('dBarChart');
  const mobileMeta = document.getElementById('mDonutMeta');
  const categoryCount = sortedCategories.filter(([, value]) => Number(value) > 0).length;
  if (mobileMeta) mobileMeta.textContent = formatCurrency(totalValue);
  if (mobileChart) {
    mobileChart.innerHTML = markup;
    animateDonutTotal(mobileChart, totalValue);
  }
  if (desktopChart) {
    desktopChart.innerHTML = markup;
    animateDonutTotal(desktopChart, totalValue);
  }
}

function buildDonutMarkup(sortedCategories, totalValue, isIncome) {
  if (!sortedCategories.length || !totalValue) {
    const emptyLabel = isIncome ? 'Sem receitas neste mês' : 'Sem gastos neste mês';
    return `<div class="empty">${emptyLabel}</div>`;
  }

  const compactCategories = compactDonutCategories(sortedCategories);

  // Atribui uma cor a cada categoria de uma vez só, garantindo unicidade —
  // duas fatias nunca saem com o mesmo tom (bug de Assinaturas × Teste).
  const colors = assignDistinctDonutColors(
    compactCategories.map(([category]) => category),
    isIncome,
    CATEGORY_COLORS,
  );

  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  let currentLength = 0;
  const arcs = compactCategories.map(([category, value], index) => {
    const segmentLength = (value / totalValue) * circumference;
    const visibleLength = Math.max(1, segmentLength - 2.2);
    const finalOffset = -currentLength;
    const hiddenOffset = visibleLength - currentLength;
    currentLength += segmentLength;
    const safeCategory = escapeHtml(category);
    const valueLabel = formatCurrency(value);
    return `
      <circle class="donut-arc" data-arc-index="${index}" cx="60" cy="60" r="${radius}" fill="none"
        stroke="${colors[index]}" stroke-width="12" pathLength="${circumference.toFixed(2)}"
        stroke-dasharray="${visibleLength.toFixed(2)} ${(circumference - visibleLength).toFixed(2)}"
        stroke-dashoffset="${finalOffset.toFixed(2)}"
        style="--arc-start:${finalOffset.toFixed(2)};--arc-hidden:${hiddenOffset.toFixed(2)};animation-delay:${index * 90}ms"
        transform="rotate(-90 60 60)" aria-hidden="true" />
      <circle class="donut-arc-hit" data-arc-index="${index}" cx="60" cy="60" r="${radius}" fill="none"
        stroke="transparent" stroke-width="44" pathLength="${circumference.toFixed(2)}"
        stroke-dasharray="${visibleLength.toFixed(2)} ${(circumference - visibleLength).toFixed(2)}"
        stroke-dashoffset="${finalOffset.toFixed(2)}"
        style="--arc-start:${finalOffset.toFixed(2)}"
        transform="rotate(-90 60 60)" role="button" tabindex="0"
        aria-label="${safeCategory}: ${valueLabel}"
        data-label="${safeCategory}" data-value="${valueLabel}" data-tone="${isIncome ? 'income' : 'expense'}"
        onclick="selectDonutArc(this)"
        onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selectDonutArc(this)}" />`;
  }).join('');

  return `
    <div class="chart-layout">
      <div class="donut-shell">
        <div class="donut-chart">
          <svg class="donut-svg" viewBox="0 0 120 120" aria-label="Distribuição por categoria">
            <circle class="donut-track" cx="60" cy="60" r="${radius}" fill="none" stroke-width="12" />
            ${arcs}
          </svg>
          <div class="donut-hole">
            <span class="donut-center-label">${isIncome ? 'Receitas' : 'Gastos'}</span>
            <strong class="donut-total ${isIncome ? 'positive' : 'negative'} priv" data-donut-total>${formatCompactCurrency(totalValue)}</strong>
            <small>${compactCategories.length} ${compactCategories.length === 1 ? 'categoria' : 'categorias'}</small>
          </div>
        </div>
      </div>
      <div class="donut-side">
        <div class="donut-legend">
          ${compactCategories.map(([category, value], index) => {
            const percent = ((value / totalValue) * 100).toFixed(0);
            const safeCategory = escapeHtml(category);
            return `
              <div class="donut-legend-row" data-arc-index="${index}" role="button" tabindex="0"
                aria-label="${safeCategory}: ${formatCurrency(value)}, ${percent}%"
                onclick="selectDonutLegend(this)"
                onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selectDonutLegend(this)}">
                <span class="donut-legend-dot" style="background:${colors[index]}" aria-hidden="true"></span>
                <span class="donut-legend-name">${safeCategory}</span>
                <strong class="donut-legend-percent">${percent}%</strong>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      <div class="fin-bar-readout donut-readout" aria-live="polite"></div>
    </div>
  `;
}

function compactDonutCategories(sortedCategories, limit = 6) {
  const positive = sortedCategories.filter(([, value]) => Number(value) > 0);
  if (positive.length <= limit) return positive;

  const visible = positive.slice(0, limit - 1).map(([category, value]) => [category, value]);
  const remainder = positive.slice(limit - 1).reduce((sum, [, value]) => sum + value, 0);
  const other = visible.find(([category]) => category === 'Outros');
  if (other) other[1] += remainder;
  else visible.push(['Outros', remainder]);
  return visible;
}

function animateDonutTotal(container, totalValue) {
  const total = container.querySelector('[data-donut-total]');
  if (!total || !totalValue) return;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) {
    total.textContent = formatCompactCurrency(totalValue);
    return;
  }

  const duration = 700;
  const startedAt = performance.now();
  total.textContent = formatCompactCurrency(0);
  const tick = (now) => {
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - ((1 - progress) ** 3);
    total.textContent = formatCompactCurrency(totalValue * eased);
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// Clique na legenda seleciona a fatia correspondente — alvo de toque grande
// para categorias pequenas, difíceis de acertar direto no arco.
window.selectDonutLegend = function (row) {
  const layout = row.closest('.chart-layout');
  if (!layout) return;
  const arc = layout.querySelector(`.donut-arc-hit[data-arc-index="${row.dataset.arcIndex}"]`);
  if (arc) window.selectDonutArc(arc);
};

window.selectDonutArc = function (target) {
  const layout = target.closest('.chart-layout');
  if (!layout) return;
  const arcIndex = target.dataset.arcIndex;
  const readout = layout.querySelector('.donut-readout');

  // Clique na fatia/legenda já selecionada desmarca tudo.
  if (target.classList.contains('active')) {
    layout.querySelectorAll('.active').forEach((item) => item.classList.remove('active'));
    if (readout) readout.classList.remove('show');
    return;
  }

  layout.querySelectorAll('.donut-arc').forEach((item) => item.classList.toggle('active', item.dataset.arcIndex === arcIndex));
  layout.querySelectorAll('.donut-arc-hit').forEach((item) => item.classList.toggle('active', item === target));
  layout.querySelectorAll('.donut-legend-row').forEach((item) => item.classList.toggle('active', item.dataset.arcIndex === arcIndex));
  if (!readout) return;
  readout.innerHTML = `
    <span class="fbr-label">${escapeHtml(target.dataset.label || '')}</span>
    <strong class="fbr-value ${target.dataset.tone || ''} priv">${escapeHtml(target.dataset.value || '')}</strong>`;
  readout.classList.add('show');
};
