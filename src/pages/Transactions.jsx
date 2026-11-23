import { useEffect, useMemo, useState } from 'react';
import CategoryBadge from '../components/CategoryIcon.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Icon from '../components/Icon.jsx';
import MonthBar from '../components/MonthBar.jsx';
import TxHistoryModal from '../components/TxHistoryModal.jsx';
import TxRow from '../components/TxRow.jsx';
import { useApp } from '../context/AppContext.jsx';
import { filterTransactions, groupByCategory, totals } from '../core/analytics.js';
import { toLocalDateInputValue } from '../core/local-date.mjs';

const EMPTY = { query: '', type: 'all', cat: '', min: '', max: '', from: '', to: '' };
const PAGE_SIZE = 30;

function formatDateGroupLabel(dayKey, todayKey, yesterdayKey, currentYear) {
  if (!dayKey) return 'Sem data';
  if (dayKey === todayKey) return 'Hoje';
  if (dayKey === yesterdayKey) return 'Ontem';
  const d = new Date(`${dayKey}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dayKey;
  return d.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    ...(d.getFullYear() === currentYear ? {} : { year: 'numeric' }),
  });
}

export default function Transactions() {
  const { monthlyTransactions, transactions, modules, openTxModal, deleteTransaction, fmt, toast } = useApp();
  const [f, setF] = useState(EMPTY);
  const [sortBy, setSortBy] = useState('date-desc');
  const [grouped, setGrouped] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [historyDesc, setHistoryDesc] = useState(null);
  const [confirmTx, setConfirmTx] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const hasDateFilter = Boolean(f.from || f.to);
  const base = hasDateFilter ? transactions : monthlyTransactions;
  const list = useMemo(() => {
    const filtered = filterTransactions(base, f);
    if (sortBy === 'val-desc') return [...filtered].sort((a, b) => b.val - a.val || b.date.localeCompare(a.date));
    if (sortBy === 'val-asc') return [...filtered].sort((a, b) => a.val - b.val || b.date.localeCompare(a.date));
    return [...filtered].sort((a, b) => b.date.localeCompare(a.date));
  }, [base, f, sortBy]);
  const summary = useMemo(() => totals(list), [list]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [f, base, sortBy]);

  const pagedList = useMemo(() => list.slice(0, visibleCount), [list, visibleCount]);
  const dateGroups = useMemo(() => {
    const now = new Date();
    const todayKey = toLocalDateInputValue(now);
    const yesterdayKey = toLocalDateInputValue(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    const currentYear = now.getFullYear();
    const groups = [];
    const byKey = new Map();
    for (const t of pagedList) {
      const key = toLocalDateInputValue(t.date);
      let grp = byKey.get(key);
      if (!grp) {
        grp = { key, label: formatDateGroupLabel(key, todayKey, yesterdayKey, currentYear), items: [] };
        byKey.set(key, grp);
        groups.push(grp);
      }
      grp.items.push(t);
    }
    return groups;
  }, [pagedList]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const activeCount = Object.entries(f).filter(([k, v]) => k !== 'type' && v && v !== EMPTY[k]).length + (f.type !== 'all' ? 1 : 0);
  const activeChips = [
    f.cat && { key: 'cat', label: `Categoria: ${f.cat}` },
    f.min && { key: 'min', label: `Mín: R$ ${f.min}` },
    f.max && { key: 'max', label: `Máx: R$ ${f.max}` },
    f.from && { key: 'from', label: `De: ${new Date(`${f.from}T12:00:00`).toLocaleDateString('pt-BR')}` },
    f.to && { key: 'to', label: `Até: ${new Date(`${f.to}T12:00:00`).toLocaleDateString('pt-BR')}` },
  ].filter(Boolean);
  const cats = [...new Set(modules.categories.map((c) => c.name).concat('Trabalho', 'Outros'))];

  const rowFor = (t) => (
    <div className="tx-item" key={t.id}>
      <TxRow tx={t} expanded={openId === t.id} onClick={() => setOpenId(openId === t.id ? null : t.id)} />
      {openId === t.id && (
        <div className="tx-actions">
          <button type="button" className="btn ghost sm" onClick={() => { setHistoryDesc(t.desc); setOpenId(null); }}>
            <Icon name="list" size={14} /> Histórico
          </button>
          <button type="button" className="btn ghost sm" onClick={() => { openTxModal(t); setOpenId(null); }}>
            <Icon name="edit" size={14} /> Editar
          </button>
          <button type="button" className="btn danger sm" onClick={() => { setConfirmTx(t); setOpenId(null); }}>
            <Icon name="trash" size={14} /> Excluir
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="page-toolbar">
        <MonthBar />
        <button type="button" className="btn sm toolbar-cta" onClick={() => openTxModal()}>
          <Icon name="plus" size={16} /> <span>Nova transação</span>
        </button>
      </div>

      <section className="card summary-strip">
        <div>
          <small>Receitas</small>
          <b className="num pos">{fmt(summary.income)}</b>
        </div>
        <div>
          <small>Saídas</small>
          <b className="num neg">{fmt(summary.expense)}</b>
        </div>
        <div>
          <small>Resultado · {list.length} {list.length === 1 ? 'item' : 'itens'}</small>
          <b className={`num ${summary.balance >= 0 ? 'pos' : 'neg'}`}>{fmt(summary.balance)}</b>
        </div>
      </section>

      <div className="filter-bar">
        <div className="search-box">
          <Icon name="search" />
          <input
            id="tx-search"
            className="input"
            type="search"
            placeholder="Buscar por descrição"
            aria-label="Buscar por descrição"
            value={f.query}
            onChange={set('query')}
          />
          {f.query ? (
            <button type="button" className="search-clear" onClick={() => setF({ ...f, query: '' })} aria-label="Limpar busca">
              <Icon name="close" size={15} />
            </button>
          ) : (
            <kbd className="kbd-hint search-kbd" aria-hidden="true">/</kbd>
          )}
        </div>

        <div className="filter-controls">
          <div className="filter-types" role="group" aria-label="Tipo">
            {[['all', 'Todas'], ['income', 'Receitas'], ['expense', 'Despesas']].map(([k, l]) => (
              <button type="button" key={k} className="chip" aria-pressed={f.type === k} onClick={() => setF({ ...f, type: k })}>{l}</button>
            ))}
          </div>

          <div className="filter-actions" role="group" aria-label="Ações de filtro">
            <select
              className="chip chip-select"
              aria-label="Ordenar lançamentos"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="date-desc">Mais recentes</option>
              <option value="val-desc">Maior valor</option>
              <option value="val-asc">Menor valor</option>
            </select>
            <button type="button" className="chip" aria-pressed={advanced} onClick={() => setAdvanced(!advanced)}>
              <Icon name="filter" /> Filtros{activeCount > 0 ? ` (${activeCount})` : ''}
            </button>
            <button type="button" className="chip" aria-pressed={grouped} onClick={() => setGrouped(!grouped)}>
              <Icon name="layers" /> Agrupar
            </button>
            {activeCount > 0 && (
              <button type="button" className="chip" onClick={() => setF(EMPTY)}><Icon name="close" /> Limpar</button>
            )}
          </div>
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className="active-filters" aria-label="Filtros ativos">
          {activeChips.map((c) => (
            <button
              type="button"
              key={c.key}
              className="filter-pill"
              onClick={() => setF((cur) => ({ ...cur, [c.key]: '' }))}
              aria-label={`Remover filtro ${c.label}`}
            >
              <span>{c.label}</span>
              <Icon name="close" size={12} />
            </button>
          ))}
        </div>
      )}

      {advanced && (
        <section className="card">
          <div className="card-head"><h3>Filtros avançados</h3></div>
          <div className="filters three">
            <div className="field">
              <label htmlFor="fc">Categoria</label>
              <select id="fc" className="input" value={f.cat} onChange={set('cat')}>
                <option value="">Todas as categorias</option>
                {cats.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="fmin">Valor mínimo (R$)</label>
              <input id="fmin" className="input" type="text" inputMode="decimal" placeholder="0,00" value={f.min} onChange={set('min')} />
            </div>
            <div className="field">
              <label htmlFor="fmax">Valor máximo (R$)</label>
              <input id="fmax" className="input" type="text" inputMode="decimal" placeholder="Sem limite" value={f.max} onChange={set('max')} />
            </div>
            <div className="field">
              <label htmlFor="ffrom">Data inicial</label>
              <input id="ffrom" className="input" type="date" value={f.from} onChange={set('from')} />
            </div>
            <div className="field">
              <label htmlFor="fto">Data final</label>
              <input id="fto" className="input" type="date" value={f.to} onChange={set('to')} />
            </div>
          </div>
        </section>
      )}

      {hasDateFilter && (
        <div className="filter-scope-note" role="status">
          <Icon name="calendar" size={15} />
          <span>Filtro de datas ativo: exibindo lançamentos de <strong>todo o histórico</strong> (mês da barra ignorado).</span>
        </div>
      )}

      {list.length === 0 ? (
        <section className="card">
          {activeCount > 0 ? (
            <EmptyState
              icon="search"
              title="Nenhuma transação encontrada"
              description="Tente ajustar os filtros ou a busca para ver seus lançamentos."
              actionLabel="Limpar filtros"
              onAction={() => setF(EMPTY)}
            />
          ) : (
            <EmptyState
              icon="receipt"
              title="Nenhuma transação neste mês"
              description="Adicione sua primeira receita ou despesa para começar o controle."
              actionLabel="Nova transação"
              onAction={() => openTxModal()}
            />
          )}
        </section>
      ) : grouped ? (
        <div className="grid-2 auto">
          {groupByCategory(list).map((g) => {
            const hasBoth = g.income > 0 && g.expense > 0;
            const tone = hasBoth ? (g.net >= 0 ? 'good' : 'bad') : (g.income > 0 ? 'good' : 'bad');
            const label = hasBoth
              ? `${g.net >= 0 ? '+' : '−'}${fmt(Math.abs(g.net))}`
              : g.income > 0
                ? `+${fmt(g.income)}`
                : `−${fmt(g.expense)}`;
            return (
              <section className="card" key={g.cat}>
                <div className="card-head">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <CategoryBadge cat={g.cat} size="sm" /> {g.cat}
                  </h3>
                  <span className={`badge ${tone} num`}>{label}</span>
                </div>
                {g.items.map(rowFor)}
              </section>
            );
          })}
        </div>
      ) : (
        <section className="card list-card">
          <p className="muted tiny list-hint">Toque em um lançamento para ver histórico, editar ou excluir</p>
          {sortBy === 'date-desc' ? (
            dateGroups.map((g) => (
              <div className="date-group" key={g.key || g.label}>
                <div className="date-group-label">
                  <span>{g.label}</span>
                  <small className="muted tiny">{g.items.length}</small>
                </div>
                {g.items.map(rowFor)}
              </div>
            ))
          ) : (
            pagedList.map(rowFor)
          )}
          {list.length > visibleCount && (
            <button
              type="button"
              className="btn ghost sm full list-load-more"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            >
              Carregar mais ({list.length - visibleCount} restantes)
            </button>
          )}
        </section>
      )}

      {historyDesc && <TxHistoryModal desc={historyDesc} onClose={() => setHistoryDesc(null)} />}
      <ConfirmDialog
        open={Boolean(confirmTx)}
        title="Excluir transação?"
        message={confirmTx ? `Deseja excluir "${confirmTx.desc}" (${fmt(confirmTx.val)})? Esta ação não pode ser desfeita.` : ''}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        danger
        onConfirm={async () => {
          const target = confirmTx;
          setConfirmTx(null);
          if (!target) return;
          try {
            await deleteTransaction(target.id);
            toast('Transação excluída.', 'info');
          } catch (ex) {
            toast(ex?.message || 'Erro ao excluir transação.', 'error');
          }
        }}
        onCancel={() => setConfirmTx(null)}
      />
    </>
  );
}
