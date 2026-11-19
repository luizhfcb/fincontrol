import { useMemo, useState } from 'react';
import CategoryBadge from '../components/CategoryIcon.jsx';
import Icon from '../components/Icon.jsx';
import MonthBar from '../components/MonthBar.jsx';
import TxHistoryModal from '../components/TxHistoryModal.jsx';
import TxRow from '../components/TxRow.jsx';
import { useApp } from '../context/AppContext.jsx';
import { filterTransactions, groupByCategory, totals } from '../core/analytics.js';

const EMPTY = { query: '', type: 'all', cat: '', min: '', max: '', from: '', to: '' };

export default function Transactions() {
  const { monthlyTransactions, transactions, modules, openTxModal, deleteTransaction, fmt } = useApp();
  const [f, setF] = useState(EMPTY);
  const [grouped, setGrouped] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [historyDesc, setHistoryDesc] = useState(null);

  const base = f.from || f.to ? transactions : monthlyTransactions;
  const list = useMemo(
    () => filterTransactions(base, f).sort((a, b) => b.date.localeCompare(a.date)),
    [base, f],
  );
  const summary = useMemo(() => totals(list), [list]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const activeCount = Object.entries(f).filter(([k, v]) => k !== 'type' && v && v !== EMPTY[k]).length + (f.type !== 'all' ? 1 : 0);
  const cats = [...new Set(modules.categories.map((c) => c.name).concat('Trabalho', 'Outros'))];

  const rowFor = (t) => (
    <div className="tx-item" key={t.id}>
      <TxRow tx={t} onClick={() => setOpenId(openId === t.id ? null : t.id)} />
      {openId === t.id && (
        <div className="tx-actions">
          <button type="button" className="btn ghost sm" onClick={() => { setHistoryDesc(t.desc); setOpenId(null); }}>
            <Icon name="list" size={14} /> Histórico
          </button>
          <button type="button" className="btn ghost sm" onClick={() => { openTxModal(t); setOpenId(null); }}>
            <Icon name="edit" size={14} /> Editar
          </button>
          <button type="button" className="btn danger sm" onClick={() => { deleteTransaction(t.id); setOpenId(null); }}>
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
            className="input"
            type="search"
            placeholder="Buscar por descrição"
            aria-label="Buscar por descrição"
            value={f.query}
            onChange={set('query')}
          />
          {f.query && (
            <button type="button" className="search-clear" onClick={() => setF({ ...f, query: '' })} aria-label="Limpar busca">
              <Icon name="close" size={15} />
            </button>
          )}
        </div>

        <div className="filter-controls">
          <div className="filter-types" role="group" aria-label="Tipo">
            {[['all', 'Todas'], ['income', 'Receitas'], ['expense', 'Despesas']].map(([k, l]) => (
              <button key={k} className="chip" aria-pressed={f.type === k} onClick={() => setF({ ...f, type: k })}>{l}</button>
            ))}
          </div>

          <div className="filter-actions" role="group" aria-label="Ações de filtro">
            <button className="chip" aria-pressed={advanced} onClick={() => setAdvanced(!advanced)}>
              <Icon name="filter" /> Filtros{activeCount > 0 ? ` (${activeCount})` : ''}
            </button>
            <button className="chip" aria-pressed={grouped} onClick={() => setGrouped(!grouped)}>
              <Icon name="layers" /> Agrupar
            </button>
            {activeCount > 0 && (
              <button className="chip" onClick={() => setF(EMPTY)}><Icon name="close" /> Limpar</button>
            )}
          </div>
        </div>
      </div>

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
              <input id="fmin" className="input" type="number" min="0" placeholder="0,00" value={f.min} onChange={set('min')} />
            </div>
            <div className="field">
              <label htmlFor="fmax">Valor máximo (R$)</label>
              <input id="fmax" className="input" type="number" min="0" placeholder="Sem limite" value={f.max} onChange={set('max')} />
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

      {list.length === 0 ? (
        <section className="card">
          <p className="empty">{activeCount ? 'Nenhuma transação corresponde aos filtros.' : 'Nenhuma transação registrada neste mês.'}</p>
        </section>
      ) : grouped ? (
        <div className="grid-2 auto">
          {groupByCategory(list).map((g) => (
            <section className="card" key={g.cat}>
              <div className="card-head">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <CategoryBadge cat={g.cat} size="sm" /> {g.cat}
                </h3>
                <span className="badge neutral num">{fmt(g.total)}</span>
              </div>
              {g.items.map(rowFor)}
            </section>
          ))}
        </div>
      ) : (
        <section className="card list-card">
          <p className="muted tiny list-hint">Toque em um lançamento para ver histórico, editar ou excluir</p>
          {list.map(rowFor)}
        </section>
      )}

      {historyDesc && <TxHistoryModal desc={historyDesc} onClose={() => setHistoryDesc(null)} />}
    </>
  );
}
