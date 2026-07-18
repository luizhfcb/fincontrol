// State layer Material: ripple radial no toque, via delegação em #mobile-app.
const RIPPLE_TARGETS = [
  '.nbtn',
  '.m-pill',
  '.recent-tx-item',
  '.more-hub-card',
  '.analytics-period-filter button',
  '.m-monthpick-cell',
  '.tx-keypad-grid button',
].join(',');

export function initRipple() {
  const root = document.getElementById('mobile-app');
  if (!root) return;

  root.addEventListener('pointerdown', (event) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const target = event.target.closest(RIPPLE_TARGETS);
    if (!target || !root.contains(target)) return;

    const styles = getComputedStyle(target);
    if (styles.position === 'static') target.style.position = 'relative';
    if (styles.overflow !== 'hidden') target.style.overflow = 'hidden';

    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const ripple = document.createElement('span');
    ripple.className = 'md-ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
    ripple.addEventListener('animationend', () => ripple.remove());
    target.appendChild(ripple);
  }, { passive: true });
}
