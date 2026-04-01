import { CATEGORY_COLORS, CATEGORY_ICONS } from '../core/constants.js';
import { state } from '../core/state.js';
import { formatCompactCurrency, formatCurrency, setText } from '../core/utils.js';
import { renderModules } from './modules.js';

export function refreshUI() {
  const monthlyTransactions = state.transactions.filter(
    (transaction) => transaction.month === state.currentMonth && transaction.year === state.currentYear,
  );

  const income = monthlyTransactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((total, transaction) => total + transaction.val, 0);

  const expenseTransactions = monthlyTransactions.filter((transaction) => transaction.type === 'expense');
  const expense = expenseTransactions.reduce((total, transaction) => total + transaction.val, 0);
  const balance = income - expense;
  const stockAlerts = (state.stock || []).filter((item) => item.qty <= (item.min || 0)).length;

  const activeDays = new Set(monthlyTransactions.map((transaction) => new Date(transaction.date).toDateString()));
  const dailyAverage = activeDays.size ? expense / activeDays.size : 0;
  const highestExpense = [...expenseTransactions].sort((left, right) => right.val - left.val)[0];

  const categoryMap = {};
  expenseTransactions.forEach((transaction) => {
    categoryMap[transaction.cat] = (categoryMap[transaction.cat] || 0) + transaction.val;
  });

  const sortedCategories = Object.entries(categoryMap).sort((left, right) => right[1] - left[1]);

  ['mBalance', 'dBalance'].forEach((id) => {
    const element = document.getElementById(id);
    if (!element) {
      return;
    }

    element.textContent = formatCurrency(Math.abs(balance));
    element.className = `big-val ${balance >= 0 ? 'positive' : 'negative'}`;
  });

  setText('mIncome', formatCurrency(income));
  setText('dIncome', formatCurrency(income));
  setText('mExpense', formatCurrency(expense));
  setText('dExpense', formatCurrency(expense));
  setText('mStockAlerts', stockAlerts);
  setText('dStockAlerts', stockAlerts);

  setText('mDays', activeDays.size);
  setText('mDays2', activeDays.size);
  setText('dDays', activeDays.size);
  setText('dDays2', activeDays.size);

  setText('mAvg', formatCompactCurrency(dailyAverage));
  setText('mAvg2', formatCompactCurrency(dailyAverage));
  setText('dAvg', formatCompactCurrency(dailyAverage));
  setText('dAvg2', formatCompactCurrency(dailyAverage));

  setText('mCount', monthlyTransactions.length);
  setText('mCount2', monthlyTransactions.length);
  setText('dCount', monthlyTransactions.length);
  setText('dCount2', monthlyTransactions.length);

  setText('mBig', highestExpense ? formatCompactCurrency(highestExpense.val) : '—');
  setText('mBig2', highestExpense ? formatCompactCurrency(highestExpense.val) : '—');
  setText('mBigSub', highestExpense ? highestExpense.desc : '—');
  setText('dBig', highestExpense ? formatCurrency(highestExpense.val) : '—');
  setText('dBig2', highestExpense ? formatCurrency(highestExpense.val) : '—');
  setText('dBigSub', highestExpense ? `${highestExpense.cat} — ${highestExpense.desc}` : '—');

  renderGroupedTransactions('mTxList', monthlyTransactions);
  renderGroupedTransactions('dTxList', monthlyTransactions);
  renderDonutCharts(sortedCategories, expense);
  renderSixMonthChart('mSixMonthChart', state.transactions);
  renderSixMonthChart('dSixMonthChart', state.transactions);
  renderModules();
}

function renderSixMonthChart(containerId, allTransactions) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const monthsMap = {};
  for(let i=5; i>=0; i--) {
     const d = new Date(state.currentYear, state.currentMonth - i, 1);
     const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}`;
     const label = d.toLocaleString('pt-BR', { month: 'short' }).substring(0,3);
     monthsMap[key] = { label, income: 0, expense: 0 };
  }

  allTransactions.forEach(tx => {
     const txDate = new Date(tx.date);
     const key = `${txDate.getFullYear()}-${String(txDate.getMonth()+1).padStart(2, '0')}`;
     if(monthsMap[key]) {
        if(tx.type === 'income') monthsMap[key].income += tx.val;
        else monthsMap[key].expense += tx.val;
     }
  });

  const data = Object.values(monthsMap);
  let maxVal = 0;
  data.forEach(d => {
     if(d.income > maxVal) maxVal = d.income;
     if(d.expense > maxVal) maxVal = d.expense;
  });
  if(maxVal === 0) maxVal = 1;

  const barsHTML = data.map(d => {
     const incPct = (d.income / maxVal) * 100;
     const expPct = (d.expense / maxVal) * 100;
     const formattedInc = d.income > 0 ? formatCompactCurrency(d.income) : '';
     const formattedExp = d.expense > 0 ? formatCompactCurrency(d.expense) : '';
     return `
      <div style="display:flex; flex-direction:column; align-items:center; gap:4px; flex:1">
         <div style="font-size:10px; color:var(--text3); height:12px; font-weight:bold">${formattedInc}</div>
         <div style="height:120px; width:100%; display:flex; gap:4px; align-items:flex-end; justify-content:center">
           <div style="height:${incPct}%; width:16px; background:var(--green); border-radius:4px 4px 0 0; transition:height 0.3s"></div>
           <div style="height:${expPct}%; width:16px; background:var(--red); border-radius:4px 4px 0 0; transition:height 0.3s"></div>
         </div>
         <div style="font-size:10px; color:var(--text3); height:12px; font-weight:bold">${formattedExp}</div>
         <div style="font-size:12px; font-weight:bold; color:var(--text2); text-transform:capitalize; margin-top:8px">${d.label}</div>
      </div>
     `;
  }).join('');

  container.innerHTML = `
    <div style="padding:24px; background:var(--card); border-radius:24px; border:1px solid var(--border)">
      <div style="display:flex; justify-content:space-between; align-items:flex-end;">
        ${barsHTML}
      </div>
      <div style="display:flex; justify-content:center; gap:20px; margin-top:20px; font-size:13px; font-weight:bold; color:var(--text2)">
        <div style="display:flex; align-items:center; gap:6px"><span style="width:12px; height:12px; border-radius:3px; background:var(--green)"></span> Receitas</div>
        <div style="display:flex; align-items:center; gap:6px"><span style="width:12px; height:12px; border-radius:3px; background:var(--red)"></span> Despesas</div>
      </div>
    </div>
  `;
}

function renderGroupedTransactions(containerId, transactions) {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }

  const recentTransactions = [...transactions]
    .sort((left, right) => new Date(right.date) - new Date(left.date))
    .slice(0, 24);

  if (!recentTransactions.length) {
    container.innerHTML = '<div class="empty">Nenhum lançamento neste mês</div>';
    return;
  }

  const grouped = new Map();

  recentTransactions.forEach((transaction) => {
    const key = transaction.cat || 'Outros';
    const existing = grouped.get(key) || {
      category: key,
      latestDate: transaction.date,
      transactions: [],
      total: 0,
    };

    existing.transactions.push(transaction);
    existing.total += transaction.type === 'income' ? transaction.val : -transaction.val;
    existing.latestDate = new Date(transaction.date) > new Date(existing.latestDate) ? transaction.date : existing.latestDate;
    grouped.set(key, existing);
  });

  const groupedTransactions = [...grouped.values()].sort(
    (left, right) => new Date(right.latestDate) - new Date(left.latestDate),
  );

  container.innerHTML = groupedTransactions.map((group) => renderGroupSection(group)).join('');
}

function renderGroupSection(group) {
  const totalClass = group.total >= 0 ? 'positive' : 'negative';
  const totalPrefix = group.total >= 0 ? '+' : '-';

  return `
    <details class="group-section" open>
      <summary class="group-head">
        <div class="group-title-wrap">
          <div class="group-icon" style="color:${CATEGORY_COLORS[group.category] || 'var(--text)'}">
            ${CATEGORY_ICONS[group.category] || '📦'}
          </div>
          <div>
            <div class="group-title">${escapeHtml(group.category)}</div>
            <div class="group-meta">${group.transactions.length} ${group.transactions.length === 1 ? 'lançamento' : 'lançamentos'}</div>
          </div>
        </div>
        <div class="group-total ${totalClass}">${totalPrefix} ${formatCurrency(Math.abs(group.total))}</div>
      </summary>
      <div class="group-list">
        ${group.transactions.map((transaction) => renderTransactionItem(transaction)).join('')}
      </div>
    </details>
  `;
}

function renderTransactionItem(transaction) {
  return `
    <div class="tx-item">
      <div class="tx-ico ${transaction.type}">${CATEGORY_ICONS[transaction.cat] || '📦'}</div>
      <div class="tx-info">
        <div class="tx-name">${escapeHtml(transaction.desc)}</div>
        <div class="tx-meta">${formatDateTime(transaction.date)} · ${transaction.type === 'income' ? 'Entrada' : 'Saída'}</div>
      </div>
      <div class="tx-right">
        <div class="tx-amt ${transaction.type === 'income' ? 'positive' : 'negative'}">
          ${transaction.type === 'income' ? '+' : '-'} ${formatCurrency(transaction.val)}
        </div>
        <button class="tdel" onclick="delTx('${transaction.id}')">✕</button>
      </div>
    </div>
  `;
}

function renderDonutCharts(sortedCategories, totalExpense) {
  const markup = buildDonutMarkup(sortedCategories, totalExpense);
  const mobileChart = document.getElementById('mBarChart');
  const desktopChart = document.getElementById('dBarChart');

  if (mobileChart) {
    mobileChart.innerHTML = markup;
  }

  if (desktopChart) {
    desktopChart.innerHTML = markup;
  }
}

function buildDonutMarkup(sortedCategories, totalExpense) {
  if (!sortedCategories.length || !totalExpense) {
    return '<div class="empty">Sem gastos neste mês</div>';
  }

  let current = 0;
  const chartStops = sortedCategories.map(([category, value]) => {
    const start = current;
    const percentage = (value / totalExpense) * 100;
    current += percentage;
    return `${CATEGORY_COLORS[category] || '#71717a'} ${start.toFixed(2)}% ${current.toFixed(2)}%`;
  });

  const largestCategory = sortedCategories[0];
  const largestShare = Math.round((largestCategory[1] / totalExpense) * 100);

  return `
    <div class="chart-layout">
      <div class="donut-shell">
        <div class="donut-chart" style="background:conic-gradient(${chartStops.join(', ')})">
          <div class="donut-hole">
            <span>Total gasto</span>
            <strong>${formatCurrency(totalExpense)}</strong>
            <small>${sortedCategories.length} categorias</small>
          </div>
        </div>
      </div>
      <div class="donut-side">
        <div class="chart-highlight">
          <span>Categoria dominante</span>
          <strong>${escapeHtml(largestCategory[0])}</strong>
          <p>${largestShare}% das despesas do período estão concentradas em <strong>${escapeHtml(largestCategory[0])}</strong>.</p>
        </div>
        <div class="donut-legend">
          ${sortedCategories.map(([category, value]) => renderLegendItem(category, value, totalExpense)).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderLegendItem(category, value, totalExpense) {
  const percentage = Math.round((value / totalExpense) * 100);

  return `
    <div class="legend-item">
      <span class="legend-dot" style="background:${CATEGORY_COLORS[category] || '#71717a'}"></span>
      <div>
        <div class="legend-name">${escapeHtml(category)}</div>
        <div class="legend-meta">${percentage}% do total</div>
      </div>
      <div class="legend-value">${formatCurrency(value)}</div>
    </div>
  `;
}

function formatDateTime(value) {
  const date = new Date(value);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).replace(',', ' ·');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
