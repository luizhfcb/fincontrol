import { useEffect, useId, useRef } from 'react';
import { useDialogA11y } from '../core/useDialogA11y.js';
import Icon from './Icon.jsx';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = true,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const titleId = useId();
  const messageId = useId();

  useDialogA11y(open, onCancel, dialogRef);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus({ preventScroll: true });
  }, [open]);

  if (!open) return null;

  return (
    <div className="overlay confirm-overlay" onClick={() => onCancel?.()}>
      <div
        ref={dialogRef}
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={message ? messageId : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-head">
          {danger && (
            <span className="confirm-ico danger" aria-hidden="true">
              <Icon name="trash" size={18} />
            </span>
          )}
          <h2 id={titleId}>{title}</h2>
        </div>

        {message && (
          <p id={messageId} className="confirm-msg">
            {message}
          </p>
        )}

        <div className="confirm-actions">
          <button
            ref={cancelRef}
            type="button"
            className="btn ghost"
            onClick={() => onCancel?.()}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'danger' : ''}`.trim()}
            onClick={() => onConfirm?.()}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
