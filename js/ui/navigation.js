import { MONTHS } from '../core/constants.js';
import { state } from '../core/state.js';
import { setText } from '../core/utils.js';
import { renderModules } from './modules.js';
import { refreshUI } from './render.js';
import { maybeSwipeHint } from './onboarding.js';

export function toggleFab() {
  const isOpen = document.getElementById('fabMenu')?.classList.toggle('show') ?? false;
  document.getElementById('fabBtn')?.classList.toggle('open', isOpen);
  document.body.classList.toggle('fab-open', isOpen);
}

export function closeFab() {
  document.getElementById('fabMenu')?.classList.remove('show');
  document.getElementById('fabBtn')?.classList.remove('open');
  document.body.classList.remove('fab-open');
}

export function goMobilePage(name) {
  document.querySelectorAll('.m-page').forEach((page) => page.classList.remove('active'));
  document.querySelectorAll('.nbtn').forEach((button) => button.classList.remove('on'));
  document.getElementById(`mp-${name}`)?.classList.add('active');
  const morePages = new Set(['limits', 'stock', 'subscriptions', 'bills']);
  const navName = morePages.has(name) ? 'more' : name;
  document.getElementById(`mn-${navName}`)?.classList.add('on');
  document.querySelector('.m-scroller')?.scrollTo({ top: 0 });
  closeFab();
  if (name === 'transactions') {
    // Ensina o gesto de swipe na primeira vez que a lista é aberta.
    setTimeout(maybeSwipeHint, 350);
  }
}

export function goDesktopPage(name) {
  document.querySelectorAll('.d-page').forEach((page) => {
    page.style.display = page.id === `dp-${name}` ? 'block' : 'none';
  });

  document.querySelectorAll('.snav-item').forEach((button) => button.classList.remove('on'));
  document.getElementById(`dn-${name}`)?.classList.add('on');
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
  refreshUI();
  renderModules();
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
  renderModules();
}
