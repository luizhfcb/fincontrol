import { initAuth, loginGoogle, doLogout } from './services/auth.js';
import { handleMic } from './services/audio.js';
import { initTheme, toggleTheme } from './services/theme.js';
import { removeTransaction } from './services/transactions.js';
import { pickCategory } from './ui/categories.js';
import { updateResponsiveAppView } from './ui/layout.js';
import { initModules, toggleBillPaid } from './ui/modules.js';
import { closeModal, closeModalOutside, confirmTx, confirmTxAudio, openModal, setModalType } from './ui/modal.js';
import { changeMonth, closeFab, goDesktopPage, goMobilePage, toggleFab } from './ui/navigation.js';

window.loginGoogle = loginGoogle;
window.doLogout = doLogout;
window.toggleTheme = toggleTheme;
window.delTx = removeTransaction;
window.openModal = openModal;
window.closeModal = closeModal;
window.closeModalOutside = closeModalOutside;
window.setModalType = setModalType;
window.confirmTx = confirmTx;
window.confirmTxAudio = confirmTxAudio;
window.pickCat = pickCategory;
window.handleMic = handleMic;
window.toggleFab = toggleFab;
window.goMPage = goMobilePage;
window.goDPage = goDesktopPage;
window.changeMonth = changeMonth;
window.toggleBillPaid = toggleBillPaid;

initTheme();
initModules();
initAuth();

window.addEventListener('resize', updateResponsiveAppView);
document.addEventListener('click', (event) => {
  const fabWrap = document.getElementById('fabWrap');
  if (fabWrap && !fabWrap.contains(event.target)) {
    closeFab();
  }
});

const isLocalEnvironment = ['localhost', '127.0.0.1'].includes(window.location.hostname);

if ('serviceWorker' in navigator) {
  if (isLocalEnvironment) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });

    if (window.caches) {
      caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
    }
  } else {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}
