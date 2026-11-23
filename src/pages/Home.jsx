import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import './HomeHero.css';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import ChartTooltip from '../components/ChartTooltip.jsx';
import DonutChart from '../components/DonutChart.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Icon from '../components/Icon.jsx';
import MonthBar from '../components/MonthBar.jsx';
import TxRow from '../components/TxRow.jsx';
import { useApp } from '../context/AppContext.jsx';
import {
  buildCategoryBreakdown, buildLimitProgress, buildMonthlyTrend, goalProgress, totals,
} from '../core/analytics.js';
import { MONTHS } from '../core/constants.js';
import { buildDashboardComparison } from '../core/dashboard-comparison.mjs';
import { buildMonthStats } from '../core/insights.js';

function PillDelta({ current, previous, label, goodWhenUp, hideValues }) {
  if (hideValues) return null;
  const cmp = buildDashboardComparison(current, previous, label);
  if (!cmp) return null;
  const up = cmp.percent >= 0;
  return (
    <span className={`hp-delta ${up === goodWhenUp ? 'good' : 'bad'}`}>
      {up ? '↑' : '↓'}{Math.abs(cmp.percent)}%
    </span>
  );
}

export default function Home() {
  const {
    transactions, monthlyTransactions, month, year,
    walletId, group, modules, goals, openTxModal, fmt, fmtCompact, hideValues,
  } = useApp();
  const [view, setView] = useState('all');

  const data = useMemo(() => {
    const prevDate = new Date(year, month - 1, 1);
    const prevTxs = transactions.filter((t) => t.month === prevDate.getMonth() && t.year === prevDate.getFullYear());
    return {
      cur: totals(monthlyTransactions),
      prev: totals(prevTxs),
      prevLabel: MONTHS[prevDate.getMonth()].slice(0, 3),
      expenseRows: buildCategoryBreakdown(monthlyTransactions, 'expense'),
      incomeRows: buildCategoryBreakdown(monthlyTransactions, 'income'),
      trend: buildMonthlyTrend(transactions, month, year, 6),
      limits: buildLimitProgress(modules.limits, monthlyTransactions),
      stats: buildMonthStats(monthlyTransactions),
    };
  }, [transactions, monthlyTransactions, month, year, modules.limits]);

  const { cur, prev, prevLabel, trend, limits, stats } = data;
  const hero = view === 'income' ? cur.income : view === 'expense' ? cur.expense : cur.balance;
  const heroLabel = view === 'income' ? 'Receitas do mês' : view === 'expense' ? 'Despesas do mês' : 'Saldo do mês';
  const heroTone = view === 'expense' || (view === 'all' && hero < 0) ? 'is-neg' : 'is-pos';
  const recent = [...monthlyTransactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const savingsRate = cur.income > 0 ? Math.round(((cur.income - cur.expense) / cur.income) * 100) : null;
  const savingsClamp = savingsRate != null ? Math.max(0, Math.min(100, savingsRate)) : 0;
  const hasFlow = cur.income + cur.expense > 0;
  const flowPct = hasFlow ? (cur.income / (cur.income + cur.expense)) * 100 : 0;
  const walletName = walletId === 'all'
    ? 'Todas as carteiras'
    : group?.wallets?.find((w) => w.id === walletId)?.name || 'Carteira';

  const totalLimit = limits.reduce((s, l) => s + l.limit, 0);
  const totalLimitSpent = limits.reduce((s, l) => s + l.spent, 0);
  const limitPct = totalLimit > 0 ? Math.round((totalLimitSpent / totalLimit) * 100) : null;
  const limitStatus = limitPct == null ? '' : limitPct >= 100 ? 'over' : limitPct >= 80 ? 'warn' : 'ok';

  const setOrToggle = (v) => setView((cur0) => (cur0 === v ? 'all' : v));

  return (
    <>
      <div className="page-toolbar">
        <MonthBar />
      </div>

      <div className="home-hero-bento">
        <section className={`hero-card ${view !== 'all' ? 'is-filtered' : ''}`}>
          <div className="hero-top">
            <span className="hero-eyebrow">
              <i className={`hero-status-dot ${heroTone}`} aria-hidden="true" />
              {heroLabel}
              {view !== 'all' && (
                <button
                  type="button"
                  className="hero-reset-btn"
                  onClick={() => setView('all')}
                  aria-label="Voltar para saldo do mês"
                >
                  Ver saldo
                </button>
              )}
            </span>
            <span className="hero-wallet-tag" title={walletName}>
              <Icon name="wallet" size={14} />
              <span className="ellipsis">{walletName}</span>
            </span>
          </div>

          <div className="hero-main">
            <strong className={`hero-val num ${heroTone}`}>{fmt(hero)}</strong>

            <p className="hero-sub">
              {monthlyTransactions.length === 0
                ? 'Nenhuma movimentação registrada neste mês ainda.'
                : hideValues
                  ? `Resumo de ${MONTHS[month].toLowerCase()} em modo privado.`
                  : savingsRate != null && savingsRate >= 0
                    ? `Você guardou ${savingsRate}% da receita em ${MONTHS[month].toLowerCase()}.`
                    : `As saídas superaram as receitas em ${MONTHS[month].toLowerCase()}.`}
            </p>
          </div>

          <div className="hero-bottom">
            <div className="hero-flow-wrap">
              {cur.income + cur.expense > 0 && (
                <div className="hero-flow-meta" aria-hidden="true">
                  <span className="hfm-in">{hideValues ? '••%' : `${Math.round(flowPct)}%`} entradas</span>
                  <span className="hfm-out">{hideValues ? '••%' : `${100 - Math.round(flowPct)}%`} saídas</span>
                </div>
              )}
              <div className={`hero-flow ${hasFlow ? '' : 'is-empty'}`.trim()} aria-hidden="true">
                <span style={{ width: `${!hasFlow ? 0 : hideValues ? 50 : flowPct}%` }} />
              </div>
            </div>

            <div className="hero-pills" role="group" aria-label="Visão do painel">
              <button
                type="button"
                className={`hero-pill in ${view === 'income' ? 'active' : ''}`}
                aria-pressed={view === 'income'}
                onClick={() => setOrToggle('income')}
              >
                <span className="hp-ico"><Icon name="arrowDown" size={15} /></span>
                <span className="hp-txt">
                  <span className="hp-top">
                    <small>Receitas</small>
                    <PillDelta current={cur.income} previous={prev.income} label={prevLabel} goodWhenUp hideValues={hideValues} />
                  </span>
                  <b className="num">{fmt(cur.income)}</b>
                </span>
              </button>
              <button
                type="button"
                className={`hero-pill out ${view === 'expense' ? 'active' : ''}`}
                aria-pressed={view === 'expense'}
                onClick={() => setOrToggle('expense')}
              >
                <span className="hp-ico"><Icon name="arrowUp" size={15} /></span>
                <span className="hp-txt">
                  <span className="hp-top">
                    <small>Despesas</small>
                    <PillDelta current={cur.expense} previous={prev.expense} label={prevLabel} goodWhenUp={false} hideValues={hideValues} />
                  </span>
                  <b className="num">{fmt(cur.expense)}</b>
                </span>
              </button>
            </div>
          </div>
        </section>

        <div className="stats-grid">
          <div className="card kpi-mini">
            <div className="km-head">
              <span>Média diária</span>
              <span className="km-ico accent"><Icon name="calendar" size={15} /></span>
            </div>
            <strong className="num">{fmt(stats.dailyAverage)}</strong>
            <div className="km-foot">
              <span className="ellipsis">{stats.activeDays} {stats.activeDays === 1 ? 'dia ativo' : 'dias ativos'} · {stats.count} {stats.count === 1 ? 'item' : 'itens'}</span>
            </div>
          </div>

          {stats.biggest ? (
            <button
              type="button"
              className="card kpi-mini kpi-link kpi-btn"
              onClick={() => openTxModal(stats.biggest)}
            >
              <div className="km-head">
                <span className="km-link-label">Maior gasto <Icon name="right" size={12} className="km-link-arrow" /></span>
                <span className="km-ico red"><Icon name="arrowUp" size={15} /></span>
              </div>
              <strong className="num neg">{fmt(stats.biggest.val)}</strong>
              <div className="km-foot">
                <span className="ellipsis">
                  {`${stats.biggest.desc} · ${stats.biggest.cat}`}
                </span>
              </div>
            </button>
          ) : (
            <div className="card kpi-mini">
              <div className="km-head">
                <span>Maior gasto</span>
                <span className="km-ico red"><Icon name="arrowUp" size={15} /></span>
              </div>
              <strong className="num neg">—</strong>
              <div className="km-foot">
                <span className="ellipsis">Nenhuma saída no mês</span>
              </div>
            </div>
          )}

          <div className="card kpi-mini">
            <div className="km-head">
              <span>Economia</span>
              <span className={`km-ico ${!hideValues && savingsRate != null && savingsRate < 0 ? 'red' : 'green'}`}>
                <Icon name="shield" size={15} />
              </span>
            </div>
            <strong className={`num ${!hideValues && savingsRate != null && savingsRate < 0 ? 'neg' : 'pos'}`}>
              {savingsRate != null ? (hideValues ? '••%' : `${savingsRate}%`) : '—'}
            </strong>
            <div className="km-foot-bar">
              <div className={`bar ${!hideValues && savingsRate != null && savingsRate < 0 ? 'over' : 'ok'}`}>
                <span style={{ width: `${hideValues ? 0 : savingsClamp}%` }} />
              </div>
              <span className="ellipsis">
                {hideValues
                  ? 'Valores ocultos'
                  : savingsRate != null
                    ? (cur.balance >= 0 ? `Saldo de ${fmtCompact(cur.balance)}` : 'Gastos acima da receita')
                    : 'Sem receitas no mês'}
              </span>
            </div>
          </div>

          <Link to="/mais/limites" className="card kpi-mini kpi-link">
            <div className="km-head">
              <span className="km-link-label">Orçamento <Icon name="right" size={12} className="km-link-arrow" /></span>
              <span className={`km-ico ${limitStatus === 'over' ? 'red' : limitStatus === 'warn' ? 'amber' : 'purple'}`}>
                <Icon name="sliders" size={15} />
              </span>
            </div>
            <strong className={`num ${!hideValues && limitStatus === 'over' ? 'neg' : !hideValues && limitStatus === 'warn' ? 'warn-txt' : ''}`}>
              {limitPct != null ? (hideValues ? '••%' : `${limitPct}%`) : '—'}
            </strong>
            <div className="km-foot-bar">
              <div className={`bar ${limitStatus}`}>
                <span style={{ width: `${hideValues ? 0 : Math.min(100, limitPct || 0)}%` }} />
              </div>
              <span className="ellipsis">
                {limitPct != null
                  ? (hideValues ? 'Valores ocultos' : `${fmtCompact(totalLimitSpent)} de ${fmtCompact(totalLimit)}`)
                  : 'Definir limites'}
              </span>
            </div>
          </Link>
        </div>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <div>
              <span className="eyebrow-sm">{view === 'income' ? 'Origem' : 'Distribuição'}</span>
              <h3>{view === 'income' ? 'Receitas por categoria' : 'Gastos por categoria'}</h3>
            </div>
            <Link to="/analises" className="text-link">Detalhes <Icon name="right" size={15} /></Link>
          </div>
          <DonutChart
            rows={view === 'income' ? data.incomeRows : data.expenseRows}
            isIncome={view === 'income'}
          />
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <span className="eyebrow-sm">Fluxo de caixa</span>
              <h3>Últimos 6 meses</h3>
            </div>
            <div className="chart-legend">
              <span><i className="donut-dot" style={{ background: 'var(--green-strong)' }} /> Receitas</span>
              <span><i className="donut-dot" style={{ background: 'var(--red-strong)' }} /> Despesas</span>
            </div>
          </div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} barGap={3} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--chart-axis)', fontSize: 12 }} />
                <YAxis
                  hide={hideValues}
                  width={48}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                  tickFormatter={(v) => (hideValues ? '' : fmtCompact(v))}
                />
                <Tooltip cursor={{ fill: 'var(--chart-cursor)' }} content={<ChartTooltip fmt={fmt} labelFormatter={(l, p) => `${l} ${p?.[0]?.payload?.year ?? ''}`} />} />
                <Bar dataKey="income" name="Receitas" fill="var(--green-strong)" radius={[6, 6, 0, 0]} maxBarSize={18} />
                <Bar dataKey="expense" name="Despesas" fill="var(--red-strong)" radius={[6, 6, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h3>Transações recentes</h3>
            <Link to="/transacoes" className="text-link">Ver todas <Icon name="right" size={15} /></Link>
          </div>
          {recent.length === 0 ? (
            <EmptyState
              compact
              icon="receipt"
              title="Nenhuma movimentação no mês"
              description="Registre um gasto ou receita para acompanhar seu fluxo."
              actionLabel="Nova transação"
              onAction={() => openTxModal(null, { defaultType: view === 'income' ? 'income' : 'expense' })}
            />
          ) : (
            recent.map((t) => (
              <div className="tx-item" key={t.id}>
                <TxRow tx={t} onClick={() => openTxModal(t)} />
              </div>
            ))
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h3>Orçamento &amp; metas</h3>
            <div className="card-head-links">
              <Link to="/mais/limites" className="text-link">Limites</Link>
              <span className="muted tiny" aria-hidden="true">·</span>
              <Link to="/mais/metas" className="text-link">Metas</Link>
            </div>
          </div>

          {limits.length === 0 && goals.length === 0 ? (
            <EmptyState
              compact
              icon="target"
              title="Sem limites ou metas"
              description="Defina tetos de gasto ou acompanhe suas reservas."
              actionLabel="Definir limites"
              actionTo="/mais/limites"
              secondaryLabel="Criar meta"
              secondaryTo="/mais/metas"
            />
          ) : (
            <div className="progress-list">
              {limits.slice(0, 3).map((l) => (
                <div key={l.id} className="progress-item">
                  <div className="progress-top">
                    <b>{l.category}</b>
                    <span className="num muted tiny">{fmt(l.spent)} / {fmt(l.limit)}</span>
                  </div>
                  <div className={`bar ${l.status}`}><span style={{ width: `${hideValues ? 0 : Math.min(100, l.percent)}%` }} /></div>
                </div>
              ))}
              {goals.slice(0, 2).map((g) => {
                const p = goalProgress(g);
                return (
                  <div key={g.id} className="progress-item">
                    <div className="progress-top">
                      <b style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="target" size={15} /> {g.name}</b>
                      <span className="badge neutral num">{hideValues ? '••%' : `${p.percent.toFixed(0)}%`}</span>
                    </div>
                    <div className={`bar ${p.done ? 'ok' : ''}`}><span style={{ width: `${hideValues ? 0 : p.percent}%` }} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
