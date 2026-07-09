// Modal "Histórico por Descrição": agrupa lançamentos do mês com a mesma
// descrição e mostra entradas/saídas/líquido.
import { MONTHS } from '../core/constants.js';
import { state } from '../core/state.js';
import { formatCurrency, getMonthlyTransactions } from '../core/utils.js';
import { escapeHtml, formatDateTime, txTypeIcon } from './ui-helpers.js';

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
