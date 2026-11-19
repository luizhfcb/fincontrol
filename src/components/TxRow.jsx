import { useApp } from '../context/AppContext.jsx';
import CategoryBadge from './CategoryIcon.jsx';

export default function TxRow({ tx, onClick }) {
  const { fmt, group } = useApp();
  const income = tx.type === 'income';
  const day = new Date(tx.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const walletName = group?.wallets?.find((w) => w.id === tx.walletId)?.name;

  return (
    <div
      className={`row ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      <CategoryBadge cat={tx.cat} type={tx.type} size="md" />
      <div className="grow">
        <b>{tx.desc}</b>
        <div className="row-meta">
          <span>{tx.cat}</span>
          <span>·</span>
          <span>{day}</span>
          {walletName && <span className="meta-tag">{walletName}</span>}
        </div>
      </div>
      <span className={`amt num ${income ? 'pos' : 'neg'}`}>
        {income ? '+' : '−'}{fmt(tx.val)}
      </span>
    </div>
  );
}
