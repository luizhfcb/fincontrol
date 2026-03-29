import { CATEGORY_COLORS, CATEGORY_ICONS } from '../core/constants.js';
import { state } from '../core/state.js';
import { formatCompactCurrency, formatCurrency, setText } from '../core/utils.js';

export function refreshUI() {
  const monthlyTransactions = state.transactions.filter(
    (transaction) => transaction.month === state.currentMonth && transaction.year === state.currentYear,
  );

  const income = monthlyTransactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((total, transaction) => total + transaction.val, 0);

  const expense = monthlyTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((total, transaction) => total + transaction.val, 0);

  const balance = income - expense;
  const expenseTransactions = monthlyTransactions.filter((transaction) => transaction.type === 'expense');
  const activeDays = new Set(monthlyTransactions.map((transaction) => new Date(transaction.date).toDateString()));
  const dailyAverage = activeDays.size ? expense / activeDays.size : 0;
  const highestExpense = [...expenseTransactions].sort((left, right) => right.val - left.val)[0];

  const categoryMap = {};
  expenseTransactions.forEach((transaction) => {
    categoryMap[transaction.cat] = (categoryMap[transaction.cat] || 0) + transaction.val;
  });

  const sortedCategories = Object.entries(categoryMap).sort((left, right) => right[1] - left[1]);
  const maxBarValue = sortedCategories[0]?.[1] || 1;

  const balanceClassName = balance >= 0 ? 'purple' : 'red';
  ['mBalance', 'dBalance'].forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = formatCurrency(Math.abs(balance));
      element.className = `big-val ${balanceClassName}`;
    }
  });

  setText('mIncome', formatCurrency(income));
  setText('dIncome', formatCurrency(income));
  setText('mExpense', formatCurrency(expense));
  setText('dExpense', formatCurrency(expense));

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

  renderMobileTransactions(monthlyTransactions);
  renderDesktopTransactions(monthlyTransactions);
  renderCharts(sortedCategories, maxBarValue);
}

function renderMobileTransactions(transactions) {
  const container = document.getElementById('mTxList');
  if (!container) {
    return;
  }

  const recentTransactions = [...transactions]
    .sort((left, right) => new Date(right.date) - new Date(left.date))
    .slice(0, 20);

  container.innerHTML = recentTransactions.length
    ? recentTransactions.map((transaction) => `
      <div class="tx-item">
        <div class="tx-ico ${transaction.type}">${CATEGORY_ICONS[transaction.cat] || '📦'}</div>
        <div class="tx-info">
          <div class="tx-name">${transaction.desc}</div>
          <div class="tx-meta">${transaction.cat} · ${new Date(transaction.date).toLocaleDateString('pt-BR')}</div>
        </div>
        <div class="tx-right">
          <div class="tx-amt ${transaction.type}">${transaction.type === 'income' ? '+' : '-'} ${formatCurrency(transaction.val)}</div>
          <button class="tdel" onclick="delTx('${transaction.id}')">✕</button>
        </div>
      </div>
    `).join('')
    : '<div class="empty">Nenhum lançamento neste mês</div>';
}

function renderDesktopTransactions(transactions) {
  const container = document.getElementById('dTxList');
  if (!container) {
    return;
  }

  const recentTransactions = [...transactions]
    .sort((left, right) => new Date(right.date) - new Date(left.date))
    .slice(0, 20);

  container.innerHTML = recentTransactions.length
    ? recentTransactions.map((transaction) => `
      <tr>
        <td style="width:44px"><div class="d-tx-ico ${transaction.type}">${CATEGORY_ICONS[transaction.cat] || '📦'}</div></td>
        <td>
          <div class="d-tx-name">${transaction.desc}</div>
          <div class="d-tx-sub">${transaction.cat} · ${new Date(transaction.date).toLocaleDateString('pt-BR')}</div>
        </td>
        <td class="d-tx-amt" style="color:${transaction.type === 'income' ? 'var(--green)' : 'var(--red)'}">
          ${transaction.type === 'income' ? '+' : '-'} ${formatCurrency(transaction.val)}
        </td>
        <td class="d-tx-del" style="width:30px;text-align:right">
          <button onclick="delTx('${transaction.id}')">✕</button>
        </td>
      </tr>
    `).join('')
    : '<tr><td colspan="4"><div class="empty">Nenhum lançamento</div></td></tr>';
}

function renderCharts(sortedCategories, maxBarValue) {
  const bars = sortedCategories.length
    ? sortedCategories.map(([category, value]) => `
      <div class="bar-row">
        <div class="bar-lbl">${CATEGORY_ICONS[category] || ''} ${category}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${Math.round((value / maxBarValue) * 100)}%;background:${CATEGORY_COLORS[category]}"></div>
        </div>
        <div class="bar-v" style="color:${CATEGORY_COLORS[category]}">${formatCurrency(value)}</div>
      </div>
    `).join('')
    : '<div class="empty">Sem gastos neste mês</div>';

  const mobileChart = document.getElementById('mBarChart');
  const desktopChart = document.getElementById('dBarChart');
  if (mobileChart) {
    mobileChart.innerHTML = bars;
  }
  if (desktopChart) {
    desktopChart.innerHTML = bars;
  }
}
