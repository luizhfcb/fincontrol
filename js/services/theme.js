const THEME_KEY = 'fc-theme';

function renderThemeIcon(theme) {
  const path = theme === 'dark'
    ? '<path d="M18 15.5A6.5 6.5 0 0 1 8.5 6a7 7 0 1 0 9.5 9.5Z" />'
    : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5"/><path d="M12 19.5V22"/><path d="M4.93 4.93l1.77 1.77"/><path d="M17.3 17.3l1.77 1.77"/><path d="M2 12h2.5"/><path d="M19.5 12H22"/><path d="M4.93 19.07l1.77-1.77"/><path d="M17.3 6.7l1.77-1.77"/>';

  return `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
}

// Cores da status bar do celular por tema (casam com o fundo do topbar)
const THEME_COLORS = { dark: '#07111d', light: '#f6f7f8' };

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);

  // Status bar (Android/Chrome PWA) acompanha o tema
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) metaThemeColor.setAttribute('content', THEME_COLORS[theme] || THEME_COLORS.dark);

  document.querySelectorAll('#mThemeBtn, #dThemeBtn').forEach((button) => {
    button.innerHTML = renderThemeIcon(theme);
    button.setAttribute('aria-label', theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro');
    button.setAttribute('title', theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro');
  });
}

export function initTheme() {
  applyTheme(localStorage.getItem(THEME_KEY) || 'dark');
}

export function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

// ─── Modo privacidade: oculta valores monetários (.priv) com blur ────────────
const PRIVACY_KEY = 'fc-privacy';

const EYE_OPEN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_CLOSED = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

function applyPrivacy(hidden) {
  document.body.classList.toggle('privacy-on', hidden);
  localStorage.setItem(PRIVACY_KEY, hidden ? '1' : '0');
  const btn = document.getElementById('mEyeBtn');
  if (btn) {
    btn.innerHTML = hidden ? EYE_CLOSED : EYE_OPEN;
    const label = hidden ? 'Mostrar valores' : 'Ocultar valores';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
  }
}

export function initPrivacy() {
  applyPrivacy(localStorage.getItem(PRIVACY_KEY) === '1');
}

export function togglePrivacy() {
  applyPrivacy(!document.body.classList.contains('privacy-on'));
}
