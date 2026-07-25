// Comportamento de diálogo compartilhado pelos overlays do app.
//
// Os modais são abertos de 10 lugares diferentes, uns com `classList.add('show')`
// e outros com `style.display = 'flex'`, alguns direto de `onclick=` no HTML.
// Em vez de reescrever cada chamada, este módulo observa os overlays
// registrados e reage à mudança de visibilidade, venha de onde vier:
//
//   - Escape fecha o diálogo do topo;
//   - o resto da página vira `inert` (sem foco, sem clique) enquanto ele está
//     aberto — é o que segura o Tab dentro do modal, sem trap manual;
//   - o foco vai para o diálogo ao abrir e volta para o gatilho ao fechar.
import { closeModal, dismissAudioTip } from './modal.js';
import { closeTxHistory } from './tx-history.js';

/** Esconde um overlay que é aberto via `style.display`. */
const hide = (element) => { element.style.display = 'none'; };

const DIALOGS = [
  { id: 'audioTipOverlay', close: dismissAudioTip },
  { id: 'modalOverlay', close: closeModal },
  { id: 'genericFormModal', close: hide },
  { id: 'logoutModal', close: hide },
  { id: 'txHistoryModal', close: closeTxHistory },
];

/** Ordem de abertura: o último a abrir é o que o Escape fecha. */
const openStack = [];
let focusBeforeDialog = null;

function isOpen(element) {
  return element.classList.contains('show') || element.style.display === 'flex';
}

/**
 * Só o diálogo do topo fica interativo; o resto do body sai do fluxo de foco.
 * O toast fica de fora: é `aria-live`, e conteúdo dentro de região inerte não
 * é anunciado — erros disparados de dentro do modal ficariam mudos.
 */
function applyInert() {
  const top = openStack[openStack.length - 1] || null;
  for (const child of document.body.children) {
    if (child.tagName === 'SCRIPT' || child.id === 'toast') continue;
    child.inert = Boolean(top) && child !== top;
  }
}

function focusDialog(element) {
  const box = element.querySelector('.modal-box, .tx-history-sheet, .audio-tip-card') || element;
  // Quem abre pode ter focado um campo (ex.: textarea do feedback) — respeitar.
  if (element.contains(document.activeElement)) return;
  if (!box.hasAttribute('tabindex')) box.setAttribute('tabindex', '-1');
  box.focus({ preventScroll: true });
}

function handleOpen(element) {
  if (openStack.includes(element)) return;
  if (openStack.length === 0) {
    focusBeforeDialog = document.activeElement;
  }
  openStack.push(element);
  applyInert();
  focusDialog(element);
}

function handleClose(element) {
  const index = openStack.indexOf(element);
  if (index === -1) return;
  openStack.splice(index, 1);
  applyInert();

  if (openStack.length > 0) {
    focusDialog(openStack[openStack.length - 1]);
    return;
  }
  // Devolve o foco a quem abriu — senão ele volta para o começo do documento.
  if (focusBeforeDialog?.isConnected) {
    focusBeforeDialog.focus({ preventScroll: true });
  }
  focusBeforeDialog = null;
}

export function initDialogs() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      const element = mutation.target;
      if (isOpen(element)) handleOpen(element);
      else handleClose(element);
    }
  });

  const registered = new Map();

  for (const { id, close } of DIALOGS) {
    const element = document.getElementById(id);
    if (!element) continue;
    registered.set(element, close);
    observer.observe(element, { attributes: true, attributeFilter: ['class', 'style'] });
    if (isOpen(element)) handleOpen(element);
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || openStack.length === 0) return;
    const top = openStack[openStack.length - 1];
    event.preventDefault();
    registered.get(top)?.(top);
  });
}
