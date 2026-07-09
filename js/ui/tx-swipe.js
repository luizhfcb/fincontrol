/* ─── Swipe-to-action nas linhas de transação ───────────────────────────────
   Desliza esquerda -> revela Excluir; direita -> revela Editar. Vanilla JS.
   Delegação de pointer no document, registrada 1x. */
import { openTxHistory } from './tx-history.js';

const SWIPE_REVEAL = 72;   // px que a linha abre em cada lado
const SWIPE_TRIGGER = 40;  // px mínimo pra "abrir"; abaixo disso volta ao lugar
let swipe = null;          // gesto ativo { el, row, startX, startY, dx, axis, moved }
let swipeJustEnded = 0;    // timestamp: suprime o click sintético pós-arraste

function closeSwipe(el) {
  if (el) el.classList.remove('open-left', 'open-right');
}
function closeAllSwipes(except) {
  document.querySelectorAll('.tx-swipe.open-left, .tx-swipe.open-right')
    .forEach((el) => { if (el !== except) closeSwipe(el); });
}

function onSwipeStart(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const target = e.target;
  if (target.closest('.tx-swipe-action')) return; // clique no botão revelado
  const el = target.closest('.tx-swipe');
  closeAllSwipes(el);
  if (!el) return;
  swipe = {
    el,
    row: el.querySelector('.tx-row'),
    startX: e.clientX,
    startY: e.clientY,
    dx: 0,
    axis: null,   // 'x' | 'y' após decidir direção
    moved: false,
  };
}

function onSwipeMove(e) {
  if (!swipe) return;
  const dx = e.clientX - swipe.startX;
  const dy = e.clientY - swipe.startY;

  if (!swipe.axis) {
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
    swipe.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (swipe.axis === 'x') {
      swipe.el.classList.add('dragging');
      // já pode ter começado aberto: soma offset atual
      if (swipe.el.classList.contains('open-left'))  swipe.startX += SWIPE_REVEAL;
      if (swipe.el.classList.contains('open-right')) swipe.startX -= SWIPE_REVEAL;
    }
  }
  if (swipe.axis !== 'x') return; // scroll vertical: deixa passar

  e.preventDefault();
  swipe.moved = true;
  // resistência além do limite de revelação
  let d = e.clientX - swipe.startX;
  if (d < -SWIPE_REVEAL) d = -SWIPE_REVEAL + (d + SWIPE_REVEAL) * 0.25;
  if (d >  SWIPE_REVEAL) d =  SWIPE_REVEAL + (d - SWIPE_REVEAL) * 0.25;
  swipe.dx = d;
  swipe.row.style.transform = `translateX(${d}px)`;
}

function onSwipeEnd() {
  if (!swipe) return;
  const { el, row, dx, axis, moved } = swipe;
  if (axis === 'x') {
    el.classList.remove('dragging');
    row.style.transform = '';
    closeSwipe(el);
    if (dx <= -SWIPE_TRIGGER)      el.classList.add('open-left');  // revela excluir
    else if (dx >= SWIPE_TRIGGER)  el.classList.add('open-right'); // revela editar
    if (moved) swipeJustEnded = Date.now();
  }
  swipe = null;
}

function initTxSwipe() {
  if (window.__txSwipeInit) return;
  window.__txSwipeInit = true;
  document.addEventListener('pointerdown', onSwipeStart, { passive: true });
  document.addEventListener('pointermove', onSwipeMove, { passive: false });
  document.addEventListener('pointerup', onSwipeEnd, { passive: true });
  document.addEventListener('pointercancel', onSwipeEnd, { passive: true });
}
initTxSwipe();

/** Clique na linha: se estava aberta (ou acabou de deslizar), só fecha. */
window.onTxRowClick = function (event, safeDesc) {
  const el = event.currentTarget.closest('.tx-swipe');
  if (el && (el.classList.contains('open-left') || el.classList.contains('open-right'))) {
    closeSwipe(el);
    return;
  }
  if (Date.now() - swipeJustEnded < 350) return; // ignorar clique pós-arraste
  openTxHistory(safeDesc);
};
