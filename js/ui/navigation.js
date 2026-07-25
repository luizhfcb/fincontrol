import { MONTHS } from '../core/constants.js';
import { state } from '../core/state.js';
import { setText } from '../core/utils.js';
import { refreshUI } from './render.js';
import { maybeSwipeHint } from './onboarding.js';

/**
 * O menu do FAB fechado é só `opacity:0` — sem `inert` as três ações seguem no
 * tab order e podem ser acionadas às cegas pelo teclado.
 */
function syncFabState(isOpen) {
  const menu = document.getElementById('fabMenu');
  const button = document.getElementById('fabBtn');
  if (menu) menu.inert = !isOpen;
  button?.classList.toggle('open', isOpen);
  button?.setAttribute('aria-expanded', String(isOpen));
  document.body.classList.toggle('fab-open', isOpen);
}

export function toggleFab() {
  syncFabState(document.getElementById('fabMenu')?.classList.toggle('show') ?? false);
}

export function closeFab() {
  document.getElementById('fabMenu')?.classList.remove('show');
  syncFabState(false);
}

/** Marca o item ativo da navegação para leitores de tela, não só no visual. */
function setNavCurrent(buttons, activeButton) {
  buttons.forEach((button) => {
    button.classList.toggle('on', button === activeButton);
    if (button === activeButton) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
}

export function goMobilePage(name) {
  document.querySelectorAll('.m-page').forEach((page) => page.classList.remove('active'));
  document.getElementById(`mp-${name}`)?.classList.add('active');
  const morePages = new Set(['limits', 'stock', 'subscriptions', 'bills']);
  const navName = morePages.has(name) ? 'more' : name;
  setNavCurrent(document.querySelectorAll('.nbtn'), document.getElementById(`mn-${navName}`));
  document.querySelector('.m-scroller')?.scrollTo({ top: 0 });
  closeFab();
  if (name === 'transactions') {
    // Ensina o gesto de swipe na primeira vez que a lista é aberta.
    setTimeout(maybeSwipeHint, 350);
  }
}

// Metadados do topbar desktop por página — o cabeçalho acompanha a seção
// ativa em vez de repetir sempre o mesmo hero genérico.
const DESKTOP_PAGE_META = {
  home: {
    eyebrow: 'Visão geral',
    title: 'Seu controle financeiro em um relance',
    subtitle: 'Acompanhe saldo, categorias e padrões de consumo do mês.',
  },
  transactions: {
    eyebrow: 'Lançamentos',
    title: 'Transações',
    subtitle: 'Busque, filtre e navegue por todos os lançamentos do mês.',
  },
  limits: {
    eyebrow: 'Orçamento',
    title: 'Limites & Categorias',
    subtitle: 'Controle seus tetos mensais com leitura rápida por categoria.',
  },
  subscriptions: {
    eyebrow: 'Recorrências',
    title: 'Assinaturas',
    subtitle: 'Acompanhe serviços recorrentes e o custo acumulado no mês.',
  },
  stock: {
    eyebrow: 'Casa',
    title: 'Estoque Doméstico',
    subtitle: 'Acompanhe itens, alertas e necessidades de reposição.',
  },
  bills: {
    eyebrow: 'Compromissos',
    title: 'Contas a Pagar',
    subtitle: 'Organize vencimentos, categorias e o status de pagamento do mês.',
  },
};

export function goDesktopPage(name) {
  document.querySelectorAll('.d-page').forEach((page) => {
    page.style.display = page.id === `dp-${name}` ? 'block' : 'none';
  });

  setNavCurrent(document.querySelectorAll('.snav-item'), document.getElementById(`dn-${name}`));

  document.body.dataset.dpage = name;
  const meta = DESKTOP_PAGE_META[name] || DESKTOP_PAGE_META.home;
  setText('dEyebrow', meta.eyebrow);
  setText('dTopbarTitle', meta.title);
  setText('dTopbarSubtitle', meta.subtitle);
  document.querySelector('.d-main')?.scrollTo({ top: 0 });
}

export function changeMonth(delta) {
  state.currentMonth += delta;

  if (state.currentMonth > 11) {
    state.currentMonth = 0;
    state.currentYear += 1;
  }

  if (state.currentMonth < 0) {
    state.currentMonth = 11;
    state.currentYear -= 1;
  }

  // Resetar busca e filtro ao trocar de mês
  state.txSearchQuery = '';
  state.txTypeFilter = 'all';
  state.heatmapSelectedDay = 1;

  const label = `${MONTHS[state.currentMonth]} ${state.currentYear}`;
  setText('monthLabel', label);
  setText('dMonthLabel', label);
  // refreshUI() já termina chamando renderModules() — não repetir.
  refreshUI();
}

// ─── Seletor de mês (dropdown no topbar mobile) ──────────────────────────────
let pickerYear = state.currentYear;

function renderMonthPickGrid() {
  const grid = document.getElementById('mMonthPickGrid');
  if (!grid) return;
  setText('mMonthPickYear', String(pickerYear));
  grid.innerHTML = MONTHS.map((name, i) => {
    const active = i === state.currentMonth && pickerYear === state.currentYear;
    return `<button class="m-monthpick-cell${active ? ' active' : ''}" role="option"
      aria-selected="${active}" onclick="pickMonth(${i})">${name.slice(0, 3)}</button>`;
  }).join('');
}

export function toggleMonthPicker() {
  const menu = document.getElementById('mMonthMenu');
  const btn  = document.getElementById('mMonthBtn');
  if (!menu) return;
  const open = menu.classList.toggle('open');
  btn?.setAttribute('aria-expanded', String(open));
  if (open) {
    pickerYear = state.currentYear;
    renderMonthPickGrid();
  }
}

export function closeMonthPicker() {
  document.getElementById('mMonthMenu')?.classList.remove('open');
  document.getElementById('mMonthBtn')?.setAttribute('aria-expanded', 'false');
}

export function pickYear(delta) {
  pickerYear += delta;
  renderMonthPickGrid();
}

export function pickMonth(month) {
  state.currentMonth = month;
  state.currentYear  = pickerYear;
  state.txSearchQuery = '';
  state.txTypeFilter = 'all';
  state.heatmapSelectedDay = 1;
  const label = `${MONTHS[state.currentMonth]} ${state.currentYear}`;
  setText('monthLabel', label);
  setText('dMonthLabel', label);
  closeMonthPicker();
  refreshUI();
}
