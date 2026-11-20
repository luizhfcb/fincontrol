import { useApp } from '../context/AppContext.jsx';
import CategoryBadge from './CategoryIcon.jsx';

export default function TxRow({ tx, onClick, expanded }) {
  const { fmt, group } = useApp();
  const income = tx.type === 'income';
  const day = new Date(tx.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const walletName = group?.wallets?.find((w) => w.id === tx.walletId)?.name;

  const content = (
    <>
      <CategoryBadge cat={tx.cat} type={tx.type} size="md" />
      <div className="grow">
        <b title={tx.desc}>{tx.desc}</b>
        <div className="row-meta">
          <span className="row-meta-cat" title={tx.cat}>{tx.cat}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={tx.date}>{day}</time>
          {walletName && (
            <span className="meta-tag" title={walletName}>
              {walletName}
            </span>
          )}
        </div>
      </div>
      <span className={`amt num ${income ? 'pos' : 'neg'}`}>
        {income ? '+' : '−'}{fmt(tx.val)}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className="row clickable"
        onClick={onClick}
        aria-expanded={expanded}
      >
        {content}
      </button>
    );
  }

  return <div className="row">{content}</div>;
}
