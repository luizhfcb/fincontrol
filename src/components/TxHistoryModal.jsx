import { useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { MONTHS } from '../core/constants.js';
import { buildDescriptionHistory } from '../core/insights.js';
import Icon from './Icon.jsx';

/** Histórico por descrição: agrupa lançamentos do mês com a mesma descrição. */
export default function TxHistoryModal({ desc, onClose }) {
  const { monthlyTransactions, month, year, fmt } = useApp();
  const h = buildDescriptionHistory(monthlyTransactions, desc);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Histórico de ${desc}`}>
        <div className="sheet-head">
          <div>
            <h2>{desc}</h2>
            <small className="muted">{MONTHS[month]} {year} · {h.items.length} {h.items.length === 1 ? 'lançamento' : 'lançamentos'}</small>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar"><Icon name="close" /></button>
        </div>

        <div className="hist-summary">
          {h.income > 0 && (
            <div className="hist-metric"><span>Entradas</span><strong className="num pos">+{fmt(h.income)}</strong></div>
          )}
          {h.expense > 0 && (
            <div className="hist-metric"><span>Saídas</span><strong className="num neg">−{fmt(h.expense)}</strong></div>
          )}
          <div className="hist-metric">
            <span>Líquido</span>
            <strong className={`num ${h.net >= 0 ? 'pos' : 'neg'}`}>{h.net >= 0 ? '+' : '−'}{fmt(Math.abs(h.net))}</strong>
          </div>
        </div>

        <div>
          {h.items.map((t) => (
            <div className="row" key={t.id}>
              <span className={`stat-ico ${t.type === 'income' ? 'in' : 'out'}`}>
                <Icon name={t.type === 'income' ? 'arrowDown' : 'arrowUp'} size={16} />
              </span>
              <div className="grow">
                <b>{t.cat || 'Outros'}</b>
                <div className="row-meta">
                  {new Date(t.date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', ' ·')}
                  <span>·</span>{t.type === 'income' ? 'Entrada' : 'Saída'}
                </div>
              </div>
              <span className={`amt num ${t.type === 'income' ? 'pos' : 'neg'}`}>{t.type === 'income' ? '+' : '−'}{fmt(t.val)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
