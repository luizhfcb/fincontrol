export function buildDashboardComparison(currentValue, previousValue, previousMonthLabel) {
  const current = Number(currentValue);
  const previous = Number(previousValue);

  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;

  const percent = Math.round(((current - previous) / Math.abs(previous)) * 100);
  return {
    percent,
    deltaText: `${percent > 0 ? '+' : ''}${percent}%`,
    contextText: `vs. ${String(previousMonthLabel || 'mês anterior').toLocaleLowerCase('pt-BR')}`,
    tone: percent >= 0 ? 'up' : 'down',
  };
}
