import { state } from '../core/state.js';

export function updateResponsiveAppView() {
  const loginScreen = document.getElementById('login-screen');
  const mobileApp = document.getElementById('mobile-app');
  const desktopApp = document.getElementById('desktop-app');

  if (!loginScreen || !mobileApp || !desktopApp) {
    return;
  }

  if (!state.currentUser) {
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
}
