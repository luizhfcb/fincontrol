import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import CategoryBadge from '../components/CategoryIcon.jsx';
import ChartTooltip from '../components/ChartTooltip.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ExpenseHeatmap from '../components/ExpenseHeatmap.jsx';
import Icon from '../components/Icon.jsx';
import MonthBar from '../components/MonthBar.jsx';
import { useApp } from '../context/AppContext.jsx';
import {
  PERIODS, PERIOD_LABELS, buildCategoryBreakdown, buildLimitProgress, buildMonthlyTrend, buildPeriod,
  buildWeekdaySpending, selectPeriodTransactions, totals,
} from '../core/analytics.js';
import { assignDistinctDonutColors } from '../core/chart-colors.mjs';
import { CATEGORY_COLORS, MONTHS } from '../core/constants.js';
import { buildDailySeries, buildMonthStats, buildWeekdayAverage, trendInsight } from '../core/insights.js';

function Delta({ current, previous, label, goodWhenUp = false, hideValues = false }) {
  if (hideValues || !label || !(previous > 0)) return null;
  const change = ((current - previous) / previous) * 100;
  const up = change >= 0;
  return (
    <span className={`badge ${up === goodWhenUp ? 'good' : 'bad'}`}>
      {up ? '↑' : '↓'} {Math.abs(change).toFixed(0)}% vs {label}
    </span>
  );
}

/** Série de gastos do período: semana (dia da semana × anterior), mês (dias), ano (meses), tudo (meses). */
function buildPeriodSeries(period, def, current, previous, all, month, year) {
  if (period === 'week') {
    const cur = buildWeekdaySpending(current);
    const prev = buildWeekdaySpending(previous);
    return {
      title: 'Gastos por dia da semana',
      data: cur.map((w, i) => ({ label: w.label, full: w.fullLabel, value: w.value, prev: prev[i].value })),
      hasPrev: prev.some((w) => w.value > 0),
    };
  }
  if (period === 'month') {
    const series = buildDailySeries(current, def.start, def.end);
    return {
      title: 'Gastos por dia do mês',
      data: series.map((d) => ({ label: d.label, full: `${d.label} de ${MONTHS[month].toLowerCase()}`, value: d.value })),
      hasPrev: false,
    };
  }
  if (period === 'year') {
    const data = MONTHS.map((m, i) => ({
      label: m.slice(0, 3),
      full: `${m} ${year}`,
      value: current.filter((t) => t.type === 'expense' && t.month === i).reduce((s, t) => s + t.val, 0),
      prev: previous.filter((t) => t.type === 'expense' && t.month === i).reduce((s, t) => s + t.val, 0),
    }));
    return { title: `Gastos por mês em ${year}`, data, hasPrev: data.some((d) => d.prev > 0) };
  }
  const keys = [...new Set(all.map((t) => t.year * 12 + t.month))].sort((a, b) => a - b);
  return {
    title: 'Gastos por mês (histórico)',
    data: keys.map((k) => {
      const y = Math.floor(k / 12); const m = k % 12;
      return {
        label: `${MONTHS[m].slice(0, 3)}${y !== year ? `/${String(y).slice(2)}` : ''}`,
        full: `${MONTHS[m]} ${y}`,
        value: all.filter((t) => t.type === 'expense' && t.month === m && t.year === y).reduce((s, t) => s + t.val, 0),
      };
    }),
    hasPrev: false,
  };
}

export default function Analytics() {
  const { transactions, monthlyTransactions, modules, month, year, fmt, fmtCompact, hideValues } = useApp();
  const [period, setPeriod] = useState('month');
  const [showAll, setShowAll] = useState(false);

  const d = useMemo(() => {
    const def = buildPeriod(period, month, year);
    const { current, previous } = selectPeriodTransactions(transactions, period, def, month, year);
    const rows = buildCategoryBreakdown(current);
    const colors = assignDistinctDonutColors(rows.map((r) => r.cat), false, CATEGORY_COLORS);
    const series = buildPeriodSeries(period, def, current, previous, transactions, month, year);
    const values = series.data.map((x) => x.value);
    const activeVals = values.filter((v) => v > 0);
    const trend = buildMonthlyTrend(transactions, month, year, 6);
    return {
      def, series,
      seriesAvg: activeVals.length ? activeVals.reduce((s, v) => s + v, 0) / activeVals.length : 0,
      seriesPeak: Math.max(...values, 0),
      cur: totals(current),
      prev: totals(previous),
      rows: rows.map((r, i) => ({ ...r, color: colors[i] })),
      weekday: buildWeekdayAverage(monthlyTransactions, month, year),
      trend: trend.map((t) => ({ ...t, net: t.income - t.expense })),
      trendInfo: trendInsight(trend),
      stats: buildMonthStats(monthlyTransactions),
      limits: buildLimitProgress(modules.limits, monthlyTransactions),
    };
  }, [transactions, monthlyTransactions, modules.limits, period, month, year]);

  const visible = showAll ? d.rows : d.rows.slice(0, 5);
  const hasFlow = d.cur.income + d.cur.expense > 0;
  const flowPct = hasFlow ? (d.cur.income / (d.cur.income + d.cur.expense)) * 100 : 0;
  const balance = d.cur.income - d.cur.expense;
  const netValues = d.trend.map((t) => t.net);
  const maxVal = netValues.length ? Math.max(...netValues) : 0;
  const minVal = netValues.length ? Math.min(...netValues) : 0;
  const allPos = minVal >= 0;
  const allNeg = maxVal <= 0;
  const zeroOffset = allPos ? 1 : allNeg ? 0 : maxVal / (maxVal - minVal);
  const hasSeriesData = d.series.data.length > 0 && (d.seriesPeak > 0 || d.series.hasPrev);
  const trendNote = {
    below: <>Você gastou <b>menos</b> que a média neste mês</>,
    above: <>Você gastou <b>mais</b> que a média neste mês</>,
    equal: <>Gasto em linha com a média</>,
    none: <>Sem despesas nos últimos meses</>,
  }[d.trendInfo.status];

  return (
    <>
      <div className="page-toolbar">
        <MonthBar />
        <div className="seg seg-inline" role="radiogroup" aria-label="Período">
          {PERIODS.map((p) => (
            <button type="button" key={p} role="radio" aria-checked={period === p} onClick={() => setPeriod(p)}>
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <section className="card summary-card">
        <div className="summary-main">
          <span className="eyebrow-sm">{d.def.heading}</span>
          <div className="summary-val-row">
            <strong className="summary-val num neg">{fmt(d.cur.expense)}</strong>
            <Delta current={d.cur.expense} previous={d.prev.expense} label={d.def.previousLabel} hideValues={hideValues} />
          </div>
          <div className={`flow-bar ${hasFlow ? '' : 'is-empty'}`.trim()} aria-hidden="true">
            <span style={{ width: `${!hasFlow ? 0 : hideValues ? 50 : flowPct}%` }} />
          </div>
        </div>
        <div className="summary-side">
          <div>
            <small>Receitas</small>
            <b className="num pos">{fmt(d.cur.income)}</b>
            <Delta current={d.cur.income} previous={d.prev.income} label={d.def.previousLabel} goodWhenUp hideValues={hideValues} />
          </div>
          <div>
            <small>Saldo</small>
            <b className={`num ${balance >= 0 ? 'pos' : 'neg'}`}>{fmt(balance)}</b>
          </div>
        </div>
      </section>

      <div className="grid-2 wide-left">
        <section className="card">
          <div className="card-head">
            <div>
              <span className="eyebrow-sm">Período · {PERIOD_LABELS[period]}</span>
              <h3>{d.series.title}</h3>
            </div>
            <div className="chart-legend">
              <span><i className="donut-dot" style={{ background: 'var(--accent)' }} /> Atual</span>
              {d.series.hasPrev && <span><i className="donut-dot" style={{ background: 'var(--chart-muted)' }} /> Anterior</span>}
              {!d.series.hasPrev && d.seriesAvg > 0 && <span><i className="legend-dash" /> Média</span>}
            </div>
          </div>
          {!hasSeriesData ? (
            <EmptyState
              compact
              icon="chart"
              title="Sem dados no período"
              description="Adicione despesas para visualizar a evolução."
            />
          ) : (
            <>
              <div className="chart-box tall">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={d.series.data} barGap={3} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={6} tick={{ fill: 'var(--chart-axis)', fontSize: 11 }} />
                    <YAxis
                      hide={hideValues}
                      width={48}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                      tickFormatter={(v) => (hideValues ? '' : fmtCompact(v))}
                    />
                    <Tooltip cursor={{ fill: 'var(--chart-cursor)' }} content={<ChartTooltip fmt={fmt} labelFormatter={(l, p) => p?.[0]?.payload?.full || l} />} />
                    {!d.series.hasPrev && d.seriesAvg > 0 && (
                      <ReferenceLine y={d.seriesAvg} stroke="var(--amber)" strokeDasharray="5 4" strokeWidth={1.5} />
                    )}
                    {d.series.hasPrev && <Bar dataKey="prev" name="Anterior" fill="var(--chart-muted)" radius={[5, 5, 0, 0]} maxBarSize={20} />}
                    <Bar dataKey="value" name="Atual" radius={[5, 5, 0, 0]} maxBarSize={20}>
                      {d.series.data.map((x) => (
                        <Cell key={x.full} fill={x.value === d.seriesPeak && x.value > 0 ? 'var(--red-strong)' : 'var(--accent)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="chart-note">
                {d.seriesPeak > 0
                  ? (
                    <>
                      Pico de <b className="num">{fmt(d.seriesPeak)}</b> · média de{' '}
                      <b className="num">{fmt(d.seriesAvg)}</b>{' '}
                      {period === 'year' || period === 'all' ? 'nos meses com gasto' : 'nos dias com gasto'}
                    </>
                  )
                  : 'Sem despesas no período.'}
              </p>
            </>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <span className="eyebrow-sm">Breakdown</span>
              <h3>Por categoria</h3>
            </div>
            <span className="muted tiny">{d.rows.length} categorias</span>
          </div>
          {d.rows.length === 0 ? (
            <EmptyState
              compact
              icon="tag"
              title="Sem despesas neste período"
              description="Os gastos agrupados por categoria aparecerão aqui."
            />
          ) : (
            <>
              {visible.map((r) => (
                <div className="breakdown-row" key={r.cat}>
                  <CategoryBadge cat={r.cat} type="expense" color={r.color} size="md" />
                  <div className="grow">
                    <div className="progress-top">
                      <b>{r.cat}</b>
                      <span className="amt num">{fmt(r.value)}</span>
                    </div>
                    <div className="progress-top" style={{ marginTop: 2 }}>
                      <small className="muted tiny">{hideValues ? '••%' : `${r.percent.toFixed(1)}%`} das saídas</small>
                    </div>
                    <div className="bar"><span style={{ width: `${hideValues ? 0 : r.percent}%`, background: r.color }} /></div>
                  </div>
                </div>
              ))}
              {d.rows.length > 5 && (
                <button type="button" className="btn ghost sm full" onClick={() => setShowAll(!showAll)}>
                  {showAll ? 'Mostrar menos' : `Ver todas as ${d.rows.length} categorias`}
                </button>
              )}
            </>
          )}
        </section>
      </div>

      <div className="section-head">
        <div>
          <div className="section-title">Comportamento em {MONTHS[month].toLowerCase()} de {year}</div>
          <p className="section-sub muted tiny">
            Referente ao mês selecionado na barra acima{period !== 'month' ? ` · independente do filtro "${PERIOD_LABELS[period]}"` : ''}
          </p>
        </div>
        <span className="badge neutral">{MONTHS[month].slice(0, 3)}/{year}</span>
      </div>

      <div className="stats-grid">
        <div className="card mini-stat">
          <span className="ms-label">Dias ativos</span>
          <strong className="num">{d.stats.activeDays}</strong>
          <small className="muted tiny">com movimentação</small>
        </div>
        <div className="card mini-stat">
          <span className="ms-label">Média diária</span>
          <strong className="num">{fmtCompact(d.stats.dailyAverage)}</strong>
          <small className="muted tiny">de despesas</small>
        </div>
        <div className="card mini-stat">
          <span className="ms-label">Registros</span>
          <strong className="num">{d.stats.count}</strong>
          <small className="muted tiny">lançamentos</small>
        </div>
        <div className="card mini-stat">
          <span className="ms-label">Maior gasto</span>
          <strong className="num">{d.stats.biggest ? fmtCompact(d.stats.biggest.val) : '—'}</strong>
          <small className="muted tiny ellipsis">{d.stats.biggest ? `${d.stats.biggest.cat} — ${d.stats.biggest.desc}` : 'Sem despesas'}</small>
        </div>
      </div>

      <section className="card hm-card">
        <ExpenseHeatmap transactions={monthlyTransactions} />
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <div>
              <span className="eyebrow-sm">Comportamento</span>
              <h3>Gasto médio por dia</h3>
            </div>
          </div>
          <p className="chart-note top">
            {d.weekday.phrase ? <>Você gasta mais <b>{d.weekday.phrase}</b></> : 'Sem despesas neste mês'}
          </p>
          <div className="chart-box short">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.weekday.rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--chart-axis)', fontSize: 11 }} />
                <YAxis hide />
                <Tooltip cursor={{ fill: 'var(--chart-cursor)' }} content={<ChartTooltip fmt={fmt} labelFormatter={(l, p) => `${p?.[0]?.payload?.fullLabel || l} (média)`} />} />
                <Bar dataKey="avg" name="Média" radius={[6, 6, 6, 6]} maxBarSize={26}>
                  {d.weekday.rows.map((r) => (
                    <Cell key={r.dow} fill={d.weekday.peak?.dow === r.dow ? 'var(--accent)' : 'var(--chart-muted)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <span className="eyebrow-sm">Tendência</span>
              <h3>Despesas · 6 meses</h3>
            </div>
            <div className="head-metric">
              <small>Média/mês</small>
              <strong className="num">{fmtCompact(d.trendInfo.average)}</strong>
            </div>
          </div>
          <p className="chart-note top">{trendNote}</p>
          <div className="chart-box short">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.trend} margin={{ top: 18, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--chart-axis)', fontSize: 11 }} />
                <YAxis hide />
                <Tooltip cursor={{ fill: 'var(--chart-cursor)' }} content={<ChartTooltip fmt={fmt} labelFormatter={(l, p) => `${l} ${p?.[0]?.payload?.year ?? ''}`} />} />
                {d.trendInfo.average > 0 && <ReferenceLine y={d.trendInfo.average} stroke="var(--amber)" strokeDasharray="5 4" />}
                <Bar dataKey="expense" name="Despesas" radius={[6, 6, 0, 0]} maxBarSize={28}>
                  {d.trend.map((t, i) => (
                    <Cell key={`${t.label}${t.year}`} fill={i === d.trend.length - 1 ? 'var(--accent)' : 'var(--chart-muted)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <div>
              <span className="eyebrow-sm">Resultado mensal</span>
              <h3>Evolução do saldo</h3>
            </div>
          </div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  {!allPos && !allNeg && (
                    <linearGradient id="netStroke" x1="0" y1="0" x2="0" y2="1">
                      <stop offset={zeroOffset} stopColor="var(--green-strong)" />
                      <stop offset={zeroOffset} stopColor="var(--red-strong)" />
                    </linearGradient>
                  )}
                  <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
                    {allPos ? (
                      <>
                        <stop offset="0%" stopColor="var(--green-strong)" stopOpacity={0.32} />
                        <stop offset="100%" stopColor="var(--green-strong)" stopOpacity={0.04} />
                      </>
                    ) : allNeg ? (
                      <>
                        <stop offset="0%" stopColor="var(--red-strong)" stopOpacity={0.04} />
                        <stop offset="100%" stopColor="var(--red-strong)" stopOpacity={0.28} />
                      </>
                    ) : (
                      <>
                        <stop offset="0%" stopColor="var(--green-strong)" stopOpacity={0.32} />
                        <stop offset={zeroOffset} stopColor="var(--green-strong)" stopOpacity={0.04} />
                        <stop offset={zeroOffset} stopColor="var(--red-strong)" stopOpacity={0.04} />
                        <stop offset="100%" stopColor="var(--red-strong)" stopOpacity={0.28} />
                      </>
                    )}
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--chart-axis)', fontSize: 12 }} />
                <YAxis
                  hide={hideValues}
                  width={54}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                  tickFormatter={(v) => (hideValues ? '' : fmtCompact(v))}
                />
                <Tooltip content={<ChartTooltip fmt={fmt} labelFormatter={(l, p) => `${l} ${p?.[0]?.payload?.year ?? ''}`} />} />
                <ReferenceLine y={0} stroke="var(--border-strong)" />
                <Area
                  baseValue={0}
                  type="monotone"
                  dataKey="net"
                  name="Saldo"
                  stroke={allPos ? 'var(--green-strong)' : allNeg ? 'var(--red-strong)' : 'url(#netStroke)'}
                  strokeWidth={2.5}
                  fill="url(#netFill)"
                  dot={(props) => {
                    if (props.cx == null || props.cy == null) return null;
                    const pos = (props.payload?.net ?? 0) >= 0;
                    return (
                      <circle
                        key={`net-dot-${props.index}`}
                        cx={props.cx}
                        cy={props.cy}
                        r={3.5}
                        fill={pos ? 'var(--green-strong)' : 'var(--red-strong)'}
                      />
                    );
                  }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <span className="eyebrow-sm">Situação</span>
              <h3>Limites do mês</h3>
            </div>
            <Link to="/mais/limites" className="text-link">Gerenciar <Icon name="right" size={15} /></Link>
          </div>
          {d.limits.length === 0 ? (
            <EmptyState
              compact
              icon="sliders"
              title="Nenhum limite definido"
              description="Defina tetos mensais por categoria para acompanhar seus gastos."
              actionLabel="Definir limites"
              actionTo="/mais/limites"
            />
          ) : (
            <div className="progress-list">
              {d.limits.map((l) => (
                <div key={l.id} className="progress-item">
                  <div className="progress-top">
                    <b style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <CategoryBadge cat={l.category} size="xs" /> {l.category}
                    </b>
                    <span className={`badge ${l.status === 'over' ? 'bad' : l.status === 'warn' ? 'warn' : 'good'}`}>
                      {hideValues ? '••%' : `${l.percent.toFixed(0)}%`}
                    </span>
                  </div>
                  <div className={`bar ${l.status}`}><span style={{ width: `${hideValues ? 0 : Math.min(100, l.percent)}%` }} /></div>
                  <small className="muted tiny num">{fmt(l.spent)} de {fmt(l.limit)}</small>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
