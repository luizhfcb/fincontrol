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

const formatDay = (day) => `Dia ${String(day).padStart(2, '0')}`;

const subscriptionStatus = (day) => day <= 10 ? 'PAGO' : 'VENCE HOJE';

const billStatus = (paid) => (paid ? 'PAGO' : 'PENDENTE');

const paidPercent = (paidBills, totalBills) => {
  if (!totalBills) return 0;
  return Math.max(0, Math.min(100, Math.round((paidBills / totalBills) * 100)));
};

const remainingBills = (totalBills, paidBills) => Math.max(0, totalBills - paidBills);
const stockStatus = (qty, min) => (qty <= min ? 'baixo estoque' : 'ok');

const iconAction = (kind, ariaLabel, onClick) => {
  const svg = kind === 'edit'
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16v4z"/><path d="M13 7l4 4"/><path d="M15 5l4 4"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14"/><path d="M9 7V5h6v2"/><path d="M8 7l1 12h6l1-12"/><path d="M10 11v5"/><path d="M14 11v5"/></svg>';

  return `<button class="mobile-icon-action ${kind === 'remove' ? 'danger' : ''}" onclick="${onClick}" aria-label="${ariaLabel}">${svg}</button>`;
};

export function renderMobileSubscriptionsModule({ subscriptions = [], totalMonth = 0 }) {
  const annualTotal = totalMonth * 12;
  const cards = subscriptions.map((subscription, index) => `
    <article class="mobile-entry-card">
      <div class="mobile-entry-card-top">
        <div class="mobile-entry-icon subscription-icon">${index % 2 === 0 ? '◫' : '♪'}</div>
        <span class="mobile-entry-badge ${subscription.day <= 10 ? 'paid' : 'due'}">${subscriptionStatus(subscription.day)}</span>
      </div>
      <div class="mobile-entry-copy">
        <strong>${escapeHtml(subscription.name)}</strong>
        <small>${escapeHtml(subscription.plan || 'Plano padrão')}</small>
      </div>
      <div class="mobile-entry-meta">
        <div>
          <span>Vencimento</span>
          <strong>${formatDay(subscription.day)}</strong>
        </div>
        <div class="mobile-entry-price">${formatCurrency(subscription.value)}</div>
      </div>
      <div class="mobile-entry-actions">
        ${iconAction('edit', 'Editar assinatura', `editSubscription('${subscription.id}')`)}
        ${iconAction('remove', 'Remover assinatura', `removeSubscription('${subscription.id}')`)}
      </div>
    </article>
  `).join('');

  return `
    <section class="mobile-module-hero subscriptions-hero">
      <div class="mobile-module-kicker">TOTAL MENSAL</div>
      <div class="mobile-module-value-row">
        <div class="mobile-module-value">${formatCurrency(totalMonth)}</div>
        <span class="mobile-module-trend">~ ${subscriptions.length ? '+2.4%' : '0%'}</span>
      </div>
      <p class="mobile-module-subcopy">${subscriptions.length ? `Projeção anual em ${formatCurrency(annualTotal)}` : 'Adicione sua primeira assinatura para acompanhar recorrências'}</p>
    </section>
    <section class="mobile-module-section-head">
      <div>
        <h3>Assinaturas Ativas</h3>
        <p>${subscriptions.length} serviço(s) recorrente(s)</p>
      </div>
      <button class="mobile-primary-cta" onclick="addSubscription()"><span>+</span>Nova assinatura</button>
    </section>
    <section class="mobile-module-list">
      ${cards || '<div class="mobile-empty-state">Nenhuma assinatura cadastrada.</div>'}
    </section>
  `;
}

export function renderMobileBillsModule({ bills = [], totalBills = 0, paidBills = 0 }) {
  const percent = paidPercent(paidBills, totalBills);
  const cards = bills.map((bill) => `
    <article class="mobile-entry-card bill-card ${bill.paid ? 'is-paid' : 'is-pending'}">
      <div class="mobile-entry-card-top">
        <div class="mobile-entry-icon bill-icon">${bill.paid ? '☁' : '▦'}</div>
        <span class="mobile-entry-badge ${bill.paid ? 'paid' : 'pending'}">${billStatus(bill.paid)}</span>
      </div>
      <div class="mobile-entry-copy">
        <strong>${escapeHtml(bill.name)}</strong>
        <small>${escapeHtml(bill.category || 'Despesa fixa')}</small>
      </div>
      <div class="mobile-entry-meta">
        <div>
          <span>Vencimento</span>
          <strong>${formatDay(bill.day)}</strong>
        </div>
        <div class="mobile-entry-price">${formatCurrency(bill.value)}</div>
      </div>
      <div class="mobile-entry-actions">
        <label class="bill-toggle">
          <input type="checkbox" ${bill.paid ? 'checked' : ''} onchange="toggleBillPaid('${bill.id}', this.checked)">
          <span>${bill.paid ? 'Pago' : 'Marcar pago'}</span>
        </label>
        ${iconAction('edit', 'Editar conta', `editBill('${bill.id}')`)}
        ${iconAction('remove', 'Remover conta', `removeBill('${bill.id}')`)}
      </div>
    </article>
  `).join('');

  return `
    <section class="mobile-module-hero bills-hero">
      <div class="mobile-module-kicker">MENSALIDADE TOTAL</div>
      <div class="mobile-module-value">${formatCurrency(totalBills)}</div>
      <div class="mobile-bills-split">
        <div>
          <span>Liquidado</span>
          <strong>${formatCurrency(paidBills)}</strong>
        </div>
        <div>
          <span>Pendente</span>
          <strong>${formatCurrency(remainingBills(totalBills, paidBills))}</strong>
        </div>
      </div>
      <div class="mobile-progress-row">
        <div class="mobile-progress-ring" style="--progress:${percent};">
          <div class="mobile-progress-hole">
            <strong>${percent}%</strong>
            <span>PAGO</span>
          </div>
        </div>
      </div>
    </section>
    <section class="mobile-module-section-head bills-head">
      <div>
        <h3>Próximos Vencimentos</h3>
        <p>${bills.length} conta(s) monitorada(s)</p>
      </div>
      <button class="mobile-inline-link" type="button">Ver histórico</button>
    </section>
    <section class="mobile-module-list with-floating-cta">
      ${cards || '<div class="mobile-empty-state">Sem contas cadastradas.</div>'}
      <button class="mobile-floating-cta" onclick="addBill()" aria-label="Nova conta">+ Nova conta</button>
    </section>
  `;
}

export function renderMobileLimitsModule({ limits = [] }) {
  const avgUsage = limits.length
    ? Math.round(limits.reduce((sum, item) => sum + item.pct, 0) / limits.length)
    : 0;

  const cards = limits.map((item) => `
    <article class="mobile-entry-card limit-card ${item.pct >= 85 ? 'is-warning' : ''}">
      <div class="mobile-entry-card-top">
        <div class="mobile-entry-icon limit-icon">${item.pct >= 85 ? '!' : '◌'}</div>
        <span class="mobile-entry-badge ${item.pct >= 85 ? 'pending' : 'paid'}">${item.pct}% usado</span>
      </div>
      <div class="mobile-entry-copy">
        <strong>${escapeHtml(item.category)}</strong>
        <small>${formatCurrency(item.spent)} de ${formatCurrency(item.limit)}</small>
      </div>
      <div class="mobile-meter">
        <div class="mobile-meter-track"><i style="width:${item.pct}%"></i></div>
      </div>
      <div class="mobile-entry-actions">
        ${iconAction('edit', 'Editar limite', `editLimit('${item.id}')`)}
        ${iconAction('remove', 'Remover limite', `removeLimit('${item.id}')`)}
      </div>
    </article>
  `).join('');

  return `
    <section class="mobile-module-hero limits-hero">
      <div class="mobile-module-kicker">CONTROLE DE GASTOS</div>
      <div class="mobile-module-value-row">
        <div class="mobile-module-value">${limits.length}</div>
        <span class="mobile-module-trend">${avgUsage}% médio</span>
      </div>
      <p class="mobile-module-subcopy">${limits.length ? 'Limites em foco para acompanhar o ritmo do mês' : 'Crie limites para monitorar categorias importantes'}</p>
    </section>
    <section class="mobile-module-section-head">
      <div>
        <h3>Limites em foco</h3>
        <p>${limits.length} categoria(s) monitorada(s)</p>
      </div>
      <button class="mobile-primary-cta" onclick="addLimit()"><span>+</span>Novo limite</button>
    </section>
    <section class="mobile-module-list">
      ${cards || '<div class="mobile-empty-state">Nenhum limite configurado.</div>'}
    </section>
  `;
}

export function renderMobileStockModule({ stockItems = [], alerts = 0 }) {
  const cards = stockItems.map((item) => {
    const ratio = Math.max(0, Math.min(100, Math.round((item.qty / Math.max(1, item.min)) * 100)));
    const isLow = item.qty <= item.min;
    return `
      <article class="mobile-entry-card stock-card ${isLow ? 'is-warning' : ''}">
        <div class="mobile-entry-card-top">
          <div class="mobile-entry-icon stock-icon">${isLow ? '!' : '□'}</div>
          <span class="mobile-entry-badge ${isLow ? 'pending' : 'paid'}">${stockStatus(item.qty, item.min)}</span>
        </div>
        <div class="mobile-entry-copy">
          <strong>${escapeHtml(item.name)}</strong>
          <small>${escapeHtml(item.category)}</small>
        </div>
        <div class="mobile-entry-meta">
          <div>
            <span>Disponível</span>
            <strong>${item.qty} un. · mín ${item.min}</strong>
          </div>
          <div class="mobile-entry-price">${ratio}%</div>
        </div>
        <div class="mobile-meter">
          <div class="mobile-meter-track"><i style="width:${ratio}%"></i></div>
        </div>
        <div class="mobile-entry-actions">
          <button class="mobile-stepper" onclick="changeStockQty('${item.id}', -1)" aria-label="Diminuir quantidade">-</button>
          <button class="mobile-stepper" onclick="changeStockQty('${item.id}', 1)" aria-label="Aumentar quantidade">+</button>
          ${iconAction('remove', 'Remover item', `removeStockItem('${item.id}')`)}
        </div>
      </article>
    `;
  }).join('');

  return `
    <section class="mobile-module-hero stock-hero">
      <div class="mobile-module-kicker">ESTOQUE DOMÉSTICO</div>
      <div class="mobile-module-value-row">
        <div class="mobile-module-value">${stockItems.length}</div>
        <span class="mobile-module-trend">${alerts} alerta(s)</span>
      </div>
      <p class="mobile-module-subcopy">${alerts ? 'Alguns itens precisam de reposição em breve' : 'Tudo sob controle no momento'}</p>
    </section>
    <section class="mobile-module-section-head">
      <div>
        <h3>Estoque ativo</h3>
        <p>${stockItems.length} item(ns) cadastrados</p>
      </div>
      <button class="mobile-primary-cta" onclick="addStockItem()"><span>+</span>Novo item</button>
    </section>
    <section class="mobile-module-list">
      ${cards || '<div class="mobile-empty-state">Sem itens no estoque.</div>'}
    </section>
  `;
}
