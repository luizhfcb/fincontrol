const THEME_KEY = 'fc-theme';

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);

  const icon = theme === 'dark' ? '🌙' : '☀️';
  document.querySelectorAll('#mThemeBtn, #dThemeBtn').forEach((button) => {
    button.textContent = icon;
  });
}

export function initTheme() {
  applyTheme(localStorage.getItem(THEME_KEY) || 'dark');
}

export function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}
