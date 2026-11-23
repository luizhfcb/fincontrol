import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

export default function EmptyState({
  icon = 'sparkles',
  title,
  description,
  actionLabel,
  onAction,
  actionTo,
  secondaryLabel,
  secondaryTo,
  compact = false,
}) {
  return (
    <div className={`empty-state ${compact ? 'is-compact' : ''}`.trim()}>
      <div className="empty-state-ico" aria-hidden="true">
        <Icon name={icon} size={compact ? 20 : 24} />
      </div>
      {title && <h4>{title}</h4>}
      {description && <p>{description}</p>}
      {(actionLabel || secondaryLabel) && (
        <div className="empty-state-actions">
          {actionLabel && (
            actionTo ? (
              <Link to={actionTo} className="btn sm">{actionLabel}</Link>
            ) : (
              <button type="button" className="btn sm" onClick={onAction}>{actionLabel}</button>
            )
          )}
          {secondaryLabel && (
            secondaryTo ? (
              <Link to={secondaryTo} className="btn ghost sm">{secondaryLabel}</Link>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
