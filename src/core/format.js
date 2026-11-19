export function formatCurrency(value) {
  return 'R$ ' + Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatCompactCurrency(value) {
  const amount = Number(value || 0);
  if (amount >= 1000) {
    const compact = (Math.round(amount / 100) / 10).toLocaleString('pt-BR');
    return `R$${compact}k`;
  }
  return `R$${Math.round(amount)}`;
}
