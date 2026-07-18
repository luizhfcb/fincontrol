// Empty state guiado único: mesmo visual no primeiro paint e nos re-renders.
const ICONS = {
  chart: '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',
  receipt: '<path d="M4 5h16v14H4zM8 9h8M8 13h5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
};

export function renderEmptyState({ icon = 'receipt', title, hint = '', ctaLabel = '', ctaAction = '' } = {}) {
  const cta = ctaLabel && ctaAction
    ? `<button type="button" onclick="${ctaAction}">${ctaLabel}</button>`
    : '';
  return `<div class="empty empty-guided">
    <span class="empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${ICONS[icon] || ICONS.receipt}</svg></span>
    <strong>${title}</strong>
    ${hint ? `<span>${hint}</span>` : ''}
    ${cta}
  </div>`;
}
