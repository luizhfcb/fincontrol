import Icon from './Icon.jsx';

const TONE_ICON = {
  success: 'check',
  error: 'close',
  info: 'sparkles',
};

export default function ToastViewport({ toasts, onDismiss }) {
  if (!toasts?.length) return null;

  return (
    <div className="toast-stack" aria-label="Notificações">
      {toasts.map((t) => {
        const isError = t.tone === 'error';
        return (
          <div
            key={t.id}
            className={`toast-item is-${t.tone || 'info'}`}
            role={isError ? 'alert' : 'status'}
            aria-live={isError ? 'assertive' : 'polite'}
          >
            <span className="toast-ico" aria-hidden="true">
              <Icon name={TONE_ICON[t.tone] || 'sparkles'} size={15} />
            </span>
            <span className="toast-msg">{t.message}</span>
            <button
              type="button"
              className="toast-close"
              onClick={() => onDismiss(t.id)}
              aria-label="Fechar aviso"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
