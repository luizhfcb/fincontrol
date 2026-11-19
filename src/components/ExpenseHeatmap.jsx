import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { MONTHS } from '../core/constants.js';
import { WEEKDAY_SHORT, buildDayDetail, buildHeatmap } from '../core/insights.js';
import CategoryBadge from './CategoryIcon.jsx';
import Icon from './Icon.jsx';

/**
 * Mapa de calor de despesas por dia do mês + detalhe do dia selecionado
 * (composição, maior compra, multiplicador do dia típico e lista).
 */
export default function ExpenseHeatmap({ transactions }) {
  const { month, year, fmt } = useApp();
  const heat = useMemo(() => buildHeatmap(transactions, month, year), [transactions, month, year]);

  const defaultDay = () => {
    if (heat.isCurrentMonth) return heat.today;
    const last = [...heat.days].reverse().find((d) => d.total > 0);
    return last ? last.day : 1;
  };
  const [selected, setSelected] = useState(defaultDay);
  useEffect(() => { setSelected(defaultDay()); }, [month, year]); // eslint-disable-line react-hooks/exhaustive-deps

  const detail = buildDayDetail(heat, selected);
  const monthName = MONTHS[month].toLowerCase();

  return (
    <div className="heatmap">
      <div className="card-head">
        <div>
          <span className="eyebrow-sm">Despesas por dia</span>
          <h3>Mapa de calor</h3>
        </div>
        <div className="head-metric">
          <small>Total no mês</small>
          <strong className="num neg">{fmt(heat.totalMonth)}</strong>
        </div>
      </div>

      {heat.insight && (
        <div className="insight-pill">
          <Icon name="trend" size={16} />
          <span>
            <b>{heat.insight.label}</b> concentra seus gastos — <span className="num">{fmt(heat.insight.total)}</span>{' '}
            <em>({heat.insight.share}% do mês)</em>
          </span>
        </div>
      )}

      <div className="hm-grid" role="grid" aria-label={`Despesas por dia em ${monthName}`}>
        {WEEKDAY_SHORT.map((w) => <span key={w} className="hm-wd">{w}</span>)}
        {Array.from({ length: heat.firstWeekday }, (_, i) => <span key={`b${i}`} className="hm-blank" aria-hidden="true" />)}
        {heat.days.map((d) => {
          const cls = [
            'hm-cell', `lv-${d.tone}`,
            d.day === detail.day ? 'selected' : '',
            heat.isCurrentMonth && d.day === heat.today ? 'today' : '',
            heat.isCurrentMonth && d.day > heat.today ? 'future' : '',
          ].filter(Boolean).join(' ');
          return (
            <button
              type="button"
              key={d.day}
              className={cls}
              onClick={() => setSelected(d.day)}
              title={`Dia ${d.day}: ${fmt(d.total)}`}
              aria-label={`Dia ${d.day}, ${fmt(d.total)} em despesas`}
              aria-pressed={d.day === detail.day}
            >
              {d.day}
            </button>
          );
        })}
      </div>

      <div className="hm-scale">
        <span>Menos</span>
        {[1, 2, 3, 4].map((l) => <i key={l} className={`hm-sw lv-${l}`} />)}
        <span>Mais</span>
      </div>

      <div className="hm-detail">
        <div className="hm-detail-top">
          <div>
            <b>{detail.weekdayLabel} · {detail.day} de {monthName}</b>
            <small className="muted tiny">{detail.count} {detail.count === 1 ? 'transação' : 'transações'}</small>
          </div>
          <strong className="num">{fmt(detail.total)}</strong>
        </div>

        {detail.multiplier > 1 && (
          <span className="badge warn" style={{ marginTop: 8 }}>{detail.multiplier.toFixed(1)}x o seu dia típico</span>
        )}

        {detail.biggest ? (
          <>
            <div className="hm-section">
              <span className="hm-section-title">Composição do dia</span>
              <div className="compo-bar">
                {detail.composition.map((c) => (
                  <span
                    key={c.tx.id}
                    style={{ width: `${c.pct}%`, background: c.color }}
                    title={`${c.tx.desc}: ${fmt(c.tx.val)} (${c.pct.toFixed(0)}%)`}
                  />
                ))}
              </div>
            </div>

            <div className="hm-section">
              <span className="hm-section-title">Transações</span>
              {detail.composition.map((c, i) => (
                <div className={`hm-row ${i === 0 && detail.count > 1 ? 'is-top' : ''}`} key={c.tx.id}>
                  <i className="donut-dot" style={{ background: c.color }} />
                  <CategoryBadge cat={c.tx.cat} type={c.tx.type} color={c.color} size="sm" />
                  <div className="grow">
                    <b>{c.tx.desc}</b>
                    <small>{c.tx.cat} · {new Date(c.tx.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small>
                  </div>
                  {i === 0 && detail.count > 1 && <span className="badge neutral">Maior</span>}
                  <span className="amt num">{fmt(c.tx.val)}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="empty" style={{ padding: '14px 0 4px' }}>Nenhuma despesa registrada nesse dia.</p>
        )}
      </div>
    </div>
  );
}
