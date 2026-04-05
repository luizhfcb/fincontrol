const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const formatCurrency = (value = 0) => currencyFormatter.format(Number(value) || 0);
const formatMonthCurrency = (value = 0) => `${formatCurrency(value)}/mês`;
const formatDay = (day) => `Dia ${day}`;
const progressTone = (pct) => (pct >= 85 ? 'danger' : pct >= 70 ? 'warn' : 'ok');
const stockTone = (qty, min) => (qty <= Math.max(1, min * 0.5) ? 'danger' : qty <= min ? 'warn' : 'ok');
const dueLabel = (days = 0) => `Estimado em ${days} dia${days === 1 ? '' : 's'}`;

const cardIcon = (kind) => {
  const icons = {
    limits: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="M5 7h14"/><path d="M5 17h8"/><circle cx="17" cy="17" r="2"/></svg>',
    subscriptions: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="6" width="14" height="13" rx="2"/><path d="M8 4v4"/><path d="M16 4v4"/><path d="M5 10h14"/></svg>',
    stock: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5"/><path d="M12 12L4 7.5"/><path d="M12 21v-9"/></svg>',
    bills: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h5"/></svg>',
    category: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l8-8 8 8-8 8-8-8z"/></svg>',
    summary: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19h14"/><path d="M7 16V9"/><path d="M12 16V5"/><path d="M17 16v-3"/></svg>',
  };

  return icons[kind] || icons.summary;
};

const actionButton = (kind, label, onClick) => `
  <button class="desktop-icon-action ${kind === 'remove' ? 'danger' : ''}" onclick="${onClick}" aria-label="${label}">
    ${kind === 'edit'
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16v4z"/><path d="M13 7l4 4"/><path d="M15 5l4 4"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14"/><path d="M9 7V5h6v2"/><path d="M8 7l1 12h6l1-12"/><path d="M10 11v5"/><path d="M14 11v5"/></svg>'}
  </button>
`;

export function renderDesktopLimitsModule({ categories = [], limits = [], within = 0, high = 0 }) {
  return `
    <section class="desktop-module-shell">
      <div class="desktop-module-top">
        <div class="desktop-title-cluster">
          <div class="desktop-title-mark limits">${cardIcon('limits')}</div>
          <div>
            <h2>Limites & Categorias</h2>
            <p>Controle seus tetos mensais com leitura rápida por categoria.</p>
          </div>
        </div>
        <button class="list-btn desktop-primary-btn" onclick="addLimit()">+ Novo Limite</button>
      </div>
      <div class="desktop-module-grid limits-grid">
        <article class="desktop-panel">
          <div class="desktop-panel-head">
            <h3><span class="desktop-inline-icon amber">${cardIcon('category')}</span>Categorias</h3>
          </div>
          <div class="desktop-chip-grid">
            ${categories.map((category) => `<div class="desktop-category-chip"><strong>${escapeHtml(category.name)}</strong><small>${escapeHtml(category.type || 'expense')}</small></div>`).join('') || '<div class="empty">Sem categorias cadastradas</div>'}
            <button class="desktop-dashed-btn" onclick="addLimit()">+ Nova categoria</button>
          </div>
        </article>
        <article class="desktop-panel desktop-panel-tall">
          <div class="desktop-panel-head">
            <h3><span class="desktop-inline-icon red">${cardIcon('limits')}</span>Limites por categoria</h3>
          </div>
          <div class="desktop-progress-list">
            ${limits.map((item) => `
              <div class="desktop-progress-row ${progressTone(item.pct)}">
                <div class="desktop-progress-copy">
                  <strong>${escapeHtml(item.category)}</strong>
                  <small>Gasto: ${formatCurrency(item.spent)} / ${formatCurrency(item.limit)}</small>
                </div>
                <div class="desktop-progress-meta">${item.pct}%</div>
                <div class="desktop-progress-track"><i style="width:${item.pct}%"></i></div>
                <div class="desktop-actions-inline">
                  ${actionButton('edit', 'Editar limite', `editLimit('${item.id}')`)}
                  ${actionButton('remove', 'Remover limite', `removeLimit('${item.id}')`)}
                </div>
              </div>
            `).join('') || '<div class="empty">Nenhum limite configurado</div>'}
          </div>
        </article>
        <article class="desktop-panel">
          <div class="desktop-panel-head">
            <h3><span class="desktop-inline-icon blue">${cardIcon('summary')}</span>Resumo de limites</h3>
          </div>
          <div class="desktop-summary-stack">
            <div class="desktop-summary-card ok">
              <div class="desktop-summary-copy">
                <strong>Dentro do limite</strong>
                <small>Categorias em situação estável</small>
              </div>
              <span>${within}</span>
            </div>
            <div class="desktop-summary-card warn">
              <div class="desktop-summary-copy">
                <strong>Alerta de gastos</strong>
                <small>Categorias acima de 70%</small>
              </div>
              <span>${high}</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  `;
}

export function renderDesktopSubscriptionsModule({ subscriptions = [], totalMonth = 0 }) {
  return `
    <section class="desktop-module-shell">
      <div class="desktop-module-top">
        <div class="desktop-title-cluster">
          <div class="desktop-title-mark subscriptions">${cardIcon('subscriptions')}</div>
          <div>
            <h2>Assinaturas</h2>
            <p>Acompanhe serviços recorrentes e o custo acumulado no mês.</p>
          </div>
        </div>
        <button class="list-btn desktop-primary-btn" onclick="addSubscription()">+ Nova Assinatura</button>
      </div>
      <div class="desktop-metric-row">
        <article class="desktop-metric-box"><label>TOTAL MENSAL</label><strong>${formatCurrency(totalMonth)}</strong><i style="width:44%"></i></article>
        <article class="desktop-metric-box"><label>TOTAL ANUAL</label><strong>${formatCurrency(totalMonth * 12)}</strong><i style="width:58%" class="violet"></i></article>
        <article class="desktop-metric-box"><label>Nº DE ASSINATURAS</label><strong>${subscriptions.length}</strong><div class="desktop-avatar-pile">${subscriptions.map((subscription) => `<span>${escapeHtml(subscription.name.slice(0, 2).toUpperCase())}</span>`).join('')}</div></article>
      </div>
      <article class="desktop-panel">
        <div class="desktop-panel-head">
          <h3><span class="desktop-inline-icon">${cardIcon('subscriptions')}</span>MINHAS ASSINATURAS</h3>
        </div>
        <div class="desktop-row-list">
          ${subscriptions.map((subscription, index) => `
            <div class="desktop-list-row">
              <div class="desktop-row-main">
                <span class="desktop-row-icon ${index % 2 === 0 ? 'blue' : 'green'}">${escapeHtml(subscription.name.slice(0, 2).toUpperCase())}</span>
                <div>
                  <strong>${escapeHtml(subscription.name)}</strong>
                  <small>${escapeHtml(subscription.plan || 'Plano padrão')}</small>
                </div>
              </div>
              <div class="desktop-row-side">
                <strong>${formatMonthCurrency(subscription.value)}</strong>
                <small>Desconto dia ${subscription.day}</small>
              </div>
              <div class="desktop-actions-inline">
                ${actionButton('edit', 'Editar assinatura', `editSubscription('${subscription.id}')`)}
                ${actionButton('remove', 'Remover assinatura', `removeSubscription('${subscription.id}')`)}
              </div>
            </div>
          `).join('') || '<div class="empty">Nenhuma assinatura cadastrada</div>'}
        </div>
      </article>
    </section>
  `;
}

export function renderDesktopBillsModule({ bills = [], total = 0, paid = 0 }) {
  return `
    <section class="desktop-module-shell">
      <div class="desktop-module-top">
        <div class="desktop-title-cluster">
          <div class="desktop-title-mark bills">${cardIcon('bills')}</div>
          <div>
            <h2>Controle de Contas</h2>
            <p>Organize vencimentos, categorias e o status de pagamento do mês.</p>
          </div>
        </div>
        <button class="list-btn desktop-primary-btn" onclick="addBill()">+ Conta</button>
      </div>
      <article class="desktop-panel desktop-table-panel">
        <div class="desktop-table-header">
          <h3><span class="desktop-inline-icon">${cardIcon('bills')}</span>Controle de Contas</h3>
          <div class="desktop-stat-pills">
            <span class="desktop-stat-pill ok"><small>PAGO</small><strong>${formatCurrency(paid)}</strong></span>
            <span class="desktop-stat-pill danger"><small>PENDENTE</small><strong>${formatCurrency(total - paid)}</strong></span>
            <span class="desktop-stat-pill total"><small>TOTAL</small><strong>${formatCurrency(total)}</strong></span>
          </div>
        </div>
        <table class="desktop-table">
          <thead>
            <tr><th>Conta</th><th>Categoria</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Ações</th></tr>
          </thead>
          <tbody>
            ${bills.map((bill) => `
              <tr class="${bill.paid ? '' : 'is-pending'}">
                <td><strong>${escapeHtml(bill.name)}</strong></td>
                <td><span class="desktop-table-chip">${escapeHtml(bill.category || 'Despesa Fixa')}</span></td>
                <td>${formatDay(bill.day)}</td>
                <td class="${bill.paid ? '' : 'danger'}"><strong>${formatCurrency(bill.value)}</strong></td>
                <td><input type="checkbox" ${bill.paid ? 'checked' : ''} onchange="toggleBillPaid('${bill.id}', this.checked)"></td>
                <td><div class="desktop-actions-inline">${actionButton('edit', 'Editar conta', `editBill('${bill.id}')`)}${actionButton('remove', 'Remover conta', `removeBill('${bill.id}')`)}</div></td>
              </tr>
            `).join('') || '<tr><td colspan="6" class="empty">Nenhuma conta cadastrada</td></tr>'}
          </tbody>
        </table>
      </article>
    </section>
  `;
}

export function renderDesktopStockModule({ stockItems = [], alerts = [] }) {
  const nextItems = [...stockItems]
    .sort((a, b) => (a.dueIn || 0) - (b.dueIn || 0))
    .slice(0, 2);

  return `
    <section class="desktop-module-shell">
      <div class="desktop-module-top">
        <div class="desktop-title-cluster">
          <div class="desktop-title-mark stock">${cardIcon('stock')}</div>
          <div>
            <h2>Estoque Doméstico</h2>
            <p>Acompanhe itens, validade e necessidades de reposição.</p>
          </div>
        </div>
        <button class="list-btn desktop-primary-btn" onclick="addStockItem()">+ Novo Item</button>
      </div>
      <div class="desktop-module-grid stock-top-grid">
        <article class="desktop-panel">
          <div class="desktop-panel-head">
            <h3><span class="desktop-inline-icon amber">${cardIcon('summary')}</span>Alertas de reposição</h3>
            <span class="desktop-status-pill ${alerts.length ? 'warn' : 'ok'}">${alerts.length ? `${alerts.length} alerta(s)` : 'ESTÁVEL'}</span>
          </div>
          <div class="desktop-alert-box ${alerts.length ? 'warn' : 'ok'}">
            <strong>${alerts.length ? 'Itens pedindo atenção' : 'Sem alertas no momento'}</strong>
            <p>${alerts.length ? 'Alguns itens essenciais estão abaixo do nível ideal.' : 'Todos os itens essenciais estão com bom nível de estoque.'}</p>
          </div>
        </article>
        <article class="desktop-panel">
          <div class="desktop-panel-head">
            <h3><span class="desktop-inline-icon blue">${cardIcon('stock')}</span>Próximas reposições</h3>
          </div>
          <div class="desktop-mini-list">
            ${nextItems.map((item) => `<div class="desktop-mini-row"><div><strong>${escapeHtml(item.name)}</strong><small>${dueLabel(item.dueIn || 0)}</small></div><span class="${stockTone(item.qty, item.min)}">${stockTone(item.qty, item.min) === 'danger' ? 'Crítico' : stockTone(item.qty, item.min) === 'warn' ? 'Regular' : 'Estável'}</span></div>`).join('') || '<div class="empty">Sem itens para reposição</div>'}
          </div>
        </article>
      </div>
      <article class="desktop-panel desktop-table-panel">
        <div class="desktop-table-header">
          <h3><span class="desktop-inline-icon">${cardIcon('stock')}</span>Itens do estoque</h3>
        </div>
        <table class="desktop-table">
          <thead>
            <tr><th>Item</th><th>Categoria</th><th>Quantidade</th><th>Status</th><th>Ações</th></tr>
          </thead>
          <tbody>
            ${stockItems.map((item) => `
              <tr>
                <td><strong>${escapeHtml(item.name)}</strong></td>
                <td>${escapeHtml(item.category || 'Sem categoria')}</td>
                <td>
                  <div class="desktop-qty-control">
                    <button onclick="changeStockQty('${item.id}', -1)">-</button>
                    <strong>${item.qty}</strong>
                    <button onclick="changeStockQty('${item.id}', 1)">+</button>
                  </div>
                </td>
                <td><span class="desktop-status-pill ${stockTone(item.qty, item.min)}">${stockTone(item.qty, item.min) === 'danger' ? 'CRÍTICO' : stockTone(item.qty, item.min) === 'warn' ? 'BAIXO' : 'DISPONÍVEL'}</span></td>
                <td><div class="desktop-actions-inline">${actionButton('remove', 'Remover item', `removeStockItem('${item.id}')`)}</div></td>
              </tr>
            `).join('') || '<tr><td colspan="5" class="empty">Sem itens no estoque</td></tr>'}
          </tbody>
        </table>
      </article>
    </section>
  `;
}
