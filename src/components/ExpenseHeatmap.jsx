import { useEffect, useMemo, useState } from 'react';
import './ExpenseHeatmap.css';
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
      <div className="hm-header">
        <div className="hm-title-block">
          <span className="eyebrow-sm">Despesas por dia</span>
          <div className="hm-title-row">
            <h3>Mapa de calor</h3>
            {heat.activeDays > 0 && (
              <span className="hm-active-chip">
                {heat.activeDays} {heat.activeDays === 1 ? 'dia ativo' : 'dias ativos'}
              </span>
            )}
          </div>
        </div>

        {heat.insight && (
          <div className="hm-insight-pill">
            <Icon name="trend" size={14} />
            <span>
              <b>{heat.insight.label}</b> concentra{' '}
              <span className="num">{fmt(heat.insight.total)}</span>{' '}
              <em>({heat.insight.share}% do mês)</em>
            </span>
          </div>
        )}

        <div className="head-metric hm-total-metric">
          <small>Total no mês</small>
          <strong className="num neg">{fmt(heat.totalMonth)}</strong>
        </div>
      </div>

      <div className="hm-body">
        <div className="hm-cal-pane">
          <div className="hm-grid" role="grid" aria-label={`Despesas por dia em ${monthName}`}>
            {WEEKDAY_SHORT.map((w) => (
              <span key={w} className="hm-wd" role="columnheader">{w}</span>
            ))}
            {Array.from({ length: heat.firstWeekday }, (_, i) => (
              <span key={`b${i}`} className="hm-blank" aria-hidden="true" />
            ))}
            {heat.days.map((d) => {
              const isSelected = d.day === detail.day;
              const isToday = heat.isCurrentMonth && d.day === heat.today;
              const isFuture = heat.isCurrentMonth && d.day > heat.today;
              const tipAlign = d.weekday === 0 ? 'tip-left' : d.weekday === 6 ? 'tip-right' : '';
              const cls = [
                'hm-cell',
                `lv-${d.tone}`,
                tipAlign,
                isSelected ? 'selected' : '',
                isToday ? 'today' : '',
                isFuture ? 'future' : '',
              ].filter(Boolean).join(' ');

              return (
                <button
                  type="button"
                  key={d.day}
                  className={cls}
                  onClick={() => setSelected(d.day)}
                  title={`Dia ${d.day}: ${d.total > 0 ? fmt(d.total) : 'Sem despesas'}`}
                  data-tip={d.total > 0 ? fmt(d.total) : 'Sem gastos'}
                  aria-label={`Dia ${d.day}, ${fmt(d.total)} em despesas`}
                  aria-pressed={isSelected}
                >
                  <span className="hm-day-num">{d.day}</span>
                  {isToday && <span className="hm-today-dot" aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          <div className="hm-cal-footer">
            <span className="hm-avg-note">
              {heat.dailyAvg > 0 ? (
                <>Dia típico: <b className="num">{fmt(heat.dailyAvg)}</b></>
              ) : (
                'Sem despesas no mês'
              )}
            </span>
            <div className="hm-scale" aria-label="Escala de intensidade de gastos">
              <span>Menos</span>
              {[0, 1, 2, 3, 4].map((l) => (
                <i key={l} className={`hm-sw lv-${l}`} aria-hidden="true" />
              ))}
              <span>Mais</span>
            </div>
          </div>
        </div>

        <div className="hm-detail-pane">
          <div className="hm-detail-head">
            <div className="hm-detail-date">
              <div className="hm-detail-title-row">
                <h4>{detail.weekdayLabel}, {detail.day} de {monthName}</h4>
                {detail.multiplier > 1 && (
                  <span className="badge warn hm-mult-badge">
                    {detail.multiplier.toFixed(1)}x dia típico
                  </span>
                )}
              </div>
              <span className="hm-detail-sub">
                {detail.count === 0
                  ? 'Sem lançamentos'
                  : `${detail.count} ${detail.count === 1 ? 'despesa' : 'despesas'}`}
                {heat.isCurrentMonth && detail.day === heat.today ? ' · Hoje' : ''}
              </span>
            </div>
            <strong className={`hm-detail-total num ${detail.total > 0 ? 'neg' : ''}`}>
              {fmt(detail.total)}
            </strong>
          </div>

          {detail.biggest ? (
            <div className="hm-detail-body">
              <div className="hm-section">
                <div className="hm-section-head">
                  <span className="hm-section-title">Composição do dia</span>
                  {detail.composition.length > 0 && (
                    <span className="hm-section-meta">
                      Maior fatia: <b>{detail.composition[0].pct.toFixed(0)}%</b>
                    </span>
                  )}
                </div>
                <div className="compo-bar">
                  {detail.composition.map((c) => (
                    <span
                      key={c.tx.id}
                      style={{ width: `${Math.max(c.pct, 2)}%`, background: c.color }}
                      title={`${c.tx.desc}: ${fmt(c.tx.val)} (${c.pct.toFixed(0)}%)`}
                    />
                  ))}
                </div>
              </div>

              <div className="hm-section hm-tx-section">
                <span className="hm-section-title">Transações</span>
                <div className="hm-tx-list">
                  {detail.composition.map((c, i) => (
                    <div className={`hm-row ${i === 0 && detail.count > 1 ? 'is-top' : ''}`} key={c.tx.id}>
                      <i className="donut-dot" style={{ background: c.color }} />
                      <CategoryBadge cat={c.tx.cat} type={c.tx.type} color={c.color} size="sm" />
                      <div className="grow">
                        <b>{c.tx.desc}</b>
                        <small>
                          {c.tx.cat} · {new Date(c.tx.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </small>
                      </div>
                      {i === 0 && detail.count > 1 && <span className="badge neutral">Maior</span>}
                      <span className="amt num">{fmt(c.tx.val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="hm-empty-state">
              <div className="hm-empty-ico">
                <Icon name="calendar" size={20} />
              </div>
              <b>Nenhuma despesa registrada nesse dia</b>
              <p>Selecione um dia destacado no calendário para ver a composição e as transações.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
