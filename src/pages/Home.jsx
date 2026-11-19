import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import ChartTooltip from '../components/ChartTooltip.jsx';
import DonutChart from '../components/DonutChart.jsx';
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

function PillDelta({ current, previous, label, goodWhenUp }) {
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
    walletId, group, modules, goals, openTxModal, fmt, fmtCompact,
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
  const flowPct = cur.income + cur.expense > 0 ? (cur.income / (cur.income + cur.expense)) * 100 : 50;
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
        <button type="button" className="btn sm toolbar-cta" onClick={() => openTxModal()}>
          <Icon name="plus" size={16} /> <span>Lançar transação</span>
        </button>
      </div>

      <section className="hero-card">
        <div className="hero-top">
          <span className="hero-eyebrow">{heroLabel}</span>
          <span className="hero-wallet-tag"><Icon name="wallet" size={14} /> {walletName}</span>
        </div>

        <strong className={`hero-val num ${heroTone}`}>{fmt(hero)}</strong>

        <p className="hero-sub">
          {monthlyTransactions.length === 0
            ? 'Nenhuma movimentação registrada neste mês ainda.'
            : savingsRate != null && savingsRate >= 0
              ? `Você guardou ${savingsRate}% da receita em ${MONTHS[month].toLowerCase()}.`
              : `As saídas superaram as receitas em ${MONTHS[month].toLowerCase()}.`}
        </p>

        <div className="hero-flow" aria-hidden="true">
          <span style={{ width: `${flowPct}%` }} />
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
                <PillDelta current={cur.income} previous={prev.income} label={prevLabel} goodWhenUp />
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
                <PillDelta current={cur.expense} previous={prev.expense} label={prevLabel} goodWhenUp={false} />
              </span>
              <b className="num">{fmt(cur.expense)}</b>
            </span>
          </button>
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

        <div className="card kpi-mini">
          <div className="km-head">
            <span>Maior gasto</span>
            <span className="km-ico red"><Icon name="arrowUp" size={15} /></span>
          </div>
          <strong className="num neg">{stats.biggest ? fmt(stats.biggest.val) : '—'}</strong>
          <div className="km-foot">
            <span className="ellipsis">
              {stats.biggest ? `${stats.biggest.desc} · ${stats.biggest.cat}` : 'Nenhuma saída no mês'}
            </span>
          </div>
        </div>

        <div className="card kpi-mini">
          <div className="km-head">
            <span>Economia</span>
            <span className={`km-ico ${savingsRate != null && savingsRate < 0 ? 'red' : 'green'}`}>
              <Icon name="shield" size={15} />
            </span>
          </div>
          <strong className={`num ${savingsRate != null && savingsRate < 0 ? 'neg' : 'pos'}`}>
            {savingsRate != null ? `${savingsRate}%` : '—'}
          </strong>
          <div className="km-foot-bar">
            <div className={`bar ${savingsRate != null && savingsRate < 0 ? 'over' : 'ok'}`}>
              <span style={{ width: `${savingsClamp}%` }} />
            </div>
            <span className="ellipsis">
              {savingsRate != null
                ? (cur.balance >= 0 ? `Saldo de ${fmtCompact(cur.balance)}` : 'Gastos acima da receita')
                : 'Sem receitas no mês'}
            </span>
          </div>
        </div>

        <Link to="/mais/limites" className="card kpi-mini kpi-link">
          <div className="km-head">
            <span>Orçamento</span>
            <span className={`km-ico ${limitStatus === 'over' ? 'red' : limitStatus === 'warn' ? 'amber' : 'purple'}`}>
              <Icon name="sliders" size={15} />
            </span>
          </div>
          <strong className={`num ${limitStatus === 'over' ? 'neg' : limitStatus === 'warn' ? 'warn-txt' : ''}`}>
            {limitPct != null ? `${limitPct}%` : '—'}
          </strong>
          <div className="km-foot-bar">
            <div className={`bar ${limitStatus}`}>
              <span style={{ width: `${Math.min(100, limitPct || 0)}%` }} />
            </div>
            <span className="ellipsis">
              {limitPct != null
                ? `${fmtCompact(totalLimitSpent)} de ${fmtCompact(totalLimit)}`
                : 'Definir limites'}
            </span>
          </div>
        </Link>
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
                <YAxis width={44} tickLine={false} axisLine={false} tick={{ fill: 'var(--chart-axis)', fontSize: 11 }} tickFormatter={(v) => fmtCompact(v)} />
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
            <p className="empty">Clique em &ldquo;Lançar transação&rdquo; para começar.</p>
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
            <Link to="/mais/limites" className="text-link">Gerenciar <Icon name="right" size={15} /></Link>
          </div>

          {limits.length === 0 && goals.length === 0 ? (
            <p className="empty">Configure limites e metas para acompanhar aqui.</p>
          ) : (
            <div className="progress-list">
              {limits.slice(0, 3).map((l) => (
                <div key={l.id} className="progress-item">
                  <div className="progress-top">
                    <b>{l.category}</b>
                    <span className="num muted tiny">{fmt(l.spent)} / {fmt(l.limit)}</span>
                  </div>
                  <div className={`bar ${l.status}`}><span style={{ width: `${Math.min(100, l.percent)}%` }} /></div>
                </div>
              ))}
              {goals.slice(0, 2).map((g) => {
                const p = goalProgress(g);
                return (
                  <div key={g.id} className="progress-item">
                    <div className="progress-top">
                      <b style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="target" size={15} /> {g.name}</b>
                      <span className="badge neutral num">{p.percent.toFixed(0)}%</span>
                    </div>
                    <div className={`bar ${p.done ? 'ok' : ''}`}><span style={{ width: `${p.percent}%` }} /></div>
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
