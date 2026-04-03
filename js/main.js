import { initAuth, loginGoogle, confirmLogout, executeLogout } from './services/auth.js';
import { handleMic } from './services/audio.js';
import { initTheme, toggleTheme } from './services/theme.js';
import { removeTransaction } from './services/transactions.js';
import { pickCategory } from './ui/categories.js';
import { initDesktopSidebar, toggleDesktopSidebar, updateResponsiveAppView } from './ui/layout.js';
import { initModules, toggleBillPaid, addSubscription, removeSubscription, editSubscription, addStockItem, removeStockItem, changeStockQty, addLimit, removeLimit, editLimit, addBill, removeBill, editBill } from './ui/modules.js';
import { closeModal, closeModalOutside, confirmTx, confirmTxAudio, openModal, setModalType } from './ui/modal.js';
import { changeMonth, closeFab, goDesktopPage, goMobilePage, toggleFab } from './ui/navigation.js';

window.loginGoogle = loginGoogle;
window.confirmLogout = confirmLogout;
window.executeLogout = executeLogout;
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
window.toggleDSidebar = toggleDesktopSidebar;
window.toggleBillPaid = toggleBillPaid;
window.addSubscription = addSubscription;
window.removeSubscription = removeSubscription;
window.editSubscription = editSubscription;
window.addStockItem = addStockItem;
window.removeStockItem = removeStockItem;
window.changeStockQty = changeStockQty;
window.addLimit = addLimit;
window.removeLimit = removeLimit;
window.editLimit = editLimit;
window.addBill = addBill;
window.removeBill = removeBill;
window.editBill = editBill;

initTheme();
initDesktopSidebar();
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
