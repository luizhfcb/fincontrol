import { state } from '../core/state.js';

const DESKTOP_SIDEBAR_KEY = 'fincontrol:desktop-sidebar-collapsed';
const DESKTOP_SIDEBAR_RESPONSIVE_BREAKPOINT = 1280;

function applyDesktopSidebarState(isCollapsed) {
  document.body.classList.toggle('desktop-sidebar-collapsed', isCollapsed);

  const toggleButton = document.getElementById('dSidebarToggle');
  if (toggleButton) {
    const label = isCollapsed ? 'Expandir barra lateral' : 'Minimizar barra lateral';
    toggleButton.setAttribute('aria-label', label);
    toggleButton.setAttribute('title', label);
    toggleButton.setAttribute('aria-pressed', String(isCollapsed));
  }
}

export function initDesktopSidebar() {
  const storedValue = window.localStorage.getItem(DESKTOP_SIDEBAR_KEY);
  const isResponsiveCollapse = window.innerWidth <= DESKTOP_SIDEBAR_RESPONSIVE_BREAKPOINT;
  document.body.classList.toggle('desktop-sidebar-responsive', isResponsiveCollapse);
  applyDesktopSidebarState(isResponsiveCollapse || storedValue === '1');
}

export function toggleDesktopSidebar() {
  const isCollapsed = !document.body.classList.contains('desktop-sidebar-collapsed');
  applyDesktopSidebarState(isCollapsed);
  window.localStorage.setItem(DESKTOP_SIDEBAR_KEY, isCollapsed ? '1' : '0');
}

export function updateResponsiveAppView() {
  const loginScreen = document.getElementById('login-screen');
  const mobileApp = document.getElementById('mobile-app');
  const desktopApp = document.getElementById('desktop-app');

  if (!loginScreen || !mobileApp || !desktopApp) {
    return;
  }

  const isLoggedIn = Boolean(state.currentUser);

  document.body.classList.toggle('logged-in', isLoggedIn);
  document.body.classList.toggle('logged-out', !isLoggedIn);

  if (!isLoggedIn) {
    loginScreen.style.display = 'flex';
    mobileApp.style.display = 'none';
    desktopApp.style.display = 'none';
    return;
  }

  loginScreen.style.display = 'none';

  if (window.innerWidth < 768) {
    mobileApp.style.display = 'flex';
    desktopApp.style.display = 'none';
  } else {
    mobileApp.style.display = 'none';
    desktopApp.style.display = 'block';
  }

  initDesktopSidebar();
}
