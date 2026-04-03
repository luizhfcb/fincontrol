const THEME_KEY = 'fc-theme';

function renderThemeIcon(theme) {
  const path = theme === 'dark'
    ? '<path d="M18 15.5A6.5 6.5 0 0 1 8.5 6a7 7 0 1 0 9.5 9.5Z" />'
    : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5"/><path d="M12 19.5V22"/><path d="M4.93 4.93l1.77 1.77"/><path d="M17.3 17.3l1.77 1.77"/><path d="M2 12h2.5"/><path d="M19.5 12H22"/><path d="M4.93 19.07l1.77-1.77"/><path d="M17.3 6.7l1.77-1.77"/>';

  return `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);

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
