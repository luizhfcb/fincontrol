export function formatCurrency(value) {
  return 'R$ ' + Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatCompactCurrency(value) {
  const amount = Number(value || 0);
  const abs = Math.abs(amount);
  if (abs >= 1000) {
    const compact = (Math.round(abs / 100) / 10).toLocaleString('pt-BR');
    return `${amount < 0 ? '-' : ''}R$${compact}k`;
  }
  const rounded = Math.round(abs);
  if (rounded === 0) return 'R$0';
  return `${amount < 0 ? '-' : ''}R$${rounded}`;
}
