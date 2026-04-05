import { MONTHS } from '../core/constants.js';
import { state } from '../core/state.js';
import { setText } from '../core/utils.js';
import { renderModules } from './modules.js';
import { refreshUI } from './render.js';

export function toggleFab() {
  document.getElementById('fabMenu')?.classList.toggle('show');
  document.getElementById('fabBtn')?.classList.toggle('open');
}

export function closeFab() {
  document.getElementById('fabMenu')?.classList.remove('show');
  document.getElementById('fabBtn')?.classList.remove('open');
}

export function goMobilePage(name) {
  document.querySelectorAll('.m-page').forEach((page) => page.classList.remove('active'));
  document.querySelectorAll('.nbtn').forEach((button) => button.classList.remove('on'));
  document.getElementById(`mp-${name}`)?.classList.add('active');
  document.getElementById(`mn-${name}`)?.classList.add('on');
  document.getElementById('fabWrap')?.classList.toggle('hidden', ['limits', 'subscriptions', 'bills', 'stock'].includes(name));
  document.querySelector('.m-scroller')?.scrollTo({ top: 0 });
  closeFab();
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

  const label = `${MONTHS[state.currentMonth]} ${state.currentYear}`;
  setText('monthLabel', label);
  setText('dMonthLabel', label);
  refreshUI();
  renderModules();
}
