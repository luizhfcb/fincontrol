/** Tooltip padrão dos gráficos Recharts, alinhado ao tema. */
export default function ChartTooltip({ active, payload, label, fmt, labelFormatter }) {
  if (!active || !payload?.length) return null;
  const title = labelFormatter ? labelFormatter(label, payload) : label;
  return (
    <div className="chart-tooltip">
      {title && <div className="ct-title">{title}</div>}
      {payload.map((entry) => (
        <div className="ct-item" key={entry.dataKey}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <i className="donut-dot" style={{ background: entry.color || entry.fill }} />
            {entry.name}
          </span>
          <span className="num">{fmt(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}
