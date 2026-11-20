import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const dialogStack = [];
let savedBodyOverflow = '';

function isVisible(el) {
  if (!el || el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true') return false;
  const style = window.getComputedStyle(el);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

function getFocusableElements(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(isVisible);
}

/**
 * Acessibilidade para diálogos/modais:
 * - Prende o foco (Tab / Shift+Tab) dentro de containerRef enquanto aberto
 * - Fecha no Escape (somente o diálogo no topo da pilha)
 * - Bloqueia o scroll do document.body enquanto houver diálogo aberto
 * - Restaura o foco ao elemento anterior ao fechar
 */
export function useDialogA11y(open, onClose, containerRef) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;

    const dialogId = Symbol('dialog');
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    dialogStack.push(dialogId);
    if (dialogStack.length === 1) {
      savedBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    const container = containerRef?.current;
    if (container && !container.contains(document.activeElement)) {
      if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '-1');
      container.focus({ preventScroll: true });
    }

    const onKeyDown = (e) => {
      if (dialogStack[dialogStack.length - 1] !== dialogId) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }

      if (e.key !== 'Tab') return;
      const el = containerRef?.current;
      if (!el) return;

      const focusables = getFocusableElements(el);
      if (focusables.length === 0) {
        e.preventDefault();
        el.focus({ preventScroll: true });
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (!el.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }

      if (e.shiftKey) {
        if (active === first || active === el) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);

      const idx = dialogStack.lastIndexOf(dialogId);
      if (idx !== -1) dialogStack.splice(idx, 1);

      if (dialogStack.length === 0) {
        document.body.style.overflow = savedBodyOverflow;
      }

      if (previousFocus && typeof previousFocus.focus === 'function' && document.contains(previousFocus)) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [open, containerRef]);
}

export default useDialogA11y;
