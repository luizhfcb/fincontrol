import { state } from '../core/state.js';
import { persistModules } from './modules.js';

const SLIDES = [
  {
    ico: '👋',
    title: 'Bem-vindo ao FinControl',
    text: 'Seu controle de entradas e gastos, rápido e na palma da mão. Vamos dar uma volta rápida.',
  },
  {
    ico: '➕',
    title: 'Registre em um toque',
    text: 'Use o botão <strong>+</strong> pra lançar uma entrada ou um gasto. Dá pra digitar ou ditar por voz.',
  },
  {
    ico: '👆',
    title: 'Deslize pra editar ou excluir',
    text: 'Arraste uma transação pro lado: <strong>direita edita</strong>, <strong>esquerda exclui</strong>. Simples assim.',
  },
  {
    ico: '💬',
    title: 'Sua opinião conta',
    text: 'Achou um bug ou tem uma ideia? Toque no ícone de <strong>balão</strong> no topo e nos conte.',
  },
];

let idx = 0;
let started = false;

function getOnboarding() {
  return state.modules?.onboarding || {};
}

async function markOnboarding(patch) {
  if (!state.modules) return;
  state.modules.onboarding = { ...getOnboarding(), ...patch };
  try {
    await persistModules();
  } catch {
    /* best-effort: flag local já atualizada */
  }
}

/** Chamado quando os módulos carregam. Mostra o carrossel uma única vez. */
export function maybeStartOnboarding() {
  if (started || !state.currentUser || !state.modules) return;
  if (getOnboarding().welcomeSeen) return;
  started = true;
  idx = 0;
  renderOverlay();
}

/** Reabre o tutorial manualmente (ex: item "Ver tutorial"). */
export function restartOnboarding() {
  idx = 0;
  renderOverlay();
}

function renderOverlay() {
  document.getElementById('onboardOverlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'onb-overlay';
  overlay.id = 'onboardOverlay';
  overlay.innerHTML = `
    <div class="onb-card" role="dialog" aria-modal="true" aria-label="Tutorial">
      <div class="onb-slide" id="onbSlide"></div>
      <div class="onb-dots" id="onbDots"></div>
      <div class="onb-actions">
        <button type="button" class="onb-skip" onclick="onbSkip()">Pular</button>
        <button type="button" class="onb-next" onclick="onbNext()" id="onbNextBtn">Próximo</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  paintSlide();
}

function paintSlide() {
  const slide = document.getElementById('onbSlide');
  const dots = document.getElementById('onbDots');
  const nextBtn = document.getElementById('onbNextBtn');
  if (!slide || !dots || !nextBtn) return;

  const s = SLIDES[idx];
  slide.innerHTML = `
    <div class="onb-ico">${s.ico}</div>
    <h2 class="onb-title">${s.title}</h2>
    <p class="onb-text">${s.text}</p>`;
  slide.classList.remove('onb-anim');
  void slide.offsetWidth; // reinicia animação
  slide.classList.add('onb-anim');

  dots.innerHTML = SLIDES
    .map((_, i) => `<span class="onb-dot${i === idx ? ' on' : ''}"></span>`)
    .join('');

  nextBtn.textContent = idx === SLIDES.length - 1 ? 'Começar' : 'Próximo';
}

export function onbNext() {
  if (idx < SLIDES.length - 1) {
    idx += 1;
    paintSlide();
    return;
  }
  finishOnboarding();
}

export function onbSkip() {
  finishOnboarding();
}

function finishOnboarding() {
  document.getElementById('onboardOverlay')?.remove();
  markOnboarding({ welcomeSeen: true });
  // Tenta o hint de swipe logo em seguida, se houver transação na tela.
  setTimeout(maybeSwipeHint, 400);
}

/**
 * Anima a primeira linha de transação revelando as ações (ghost swipe),
 * ensinando o gesto. Roda uma única vez.
 */
export function maybeSwipeHint() {
  if (!state.currentUser || !state.modules) return;
  if (getOnboarding().swipeHintSeen) return;
  if (!getOnboarding().welcomeSeen) return; // só depois do carrossel

  const row = document.querySelector('.m-page.active .tx-swipe')
    || document.querySelector('.tx-swipe');
  if (!row) return; // sem transações ainda: espera a próxima renderização

  row.classList.add('tx-swipe-hint');
  setTimeout(() => row.classList.remove('tx-swipe-hint'), 2600);
  markOnboarding({ swipeHintSeen: true });
}
