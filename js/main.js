import { initAuth, loginGoogle, confirmLogout, executeLogout } from './services/auth.js';
import { handleMic } from './services/audio.js';
import { initTheme, toggleTheme, initPrivacy, togglePrivacy } from './services/theme.js';
import { removeTransaction } from './services/transactions.js';
import { pickCategory, openInlineCatInput, cancelInlineCatInput, saveInlineCategory, toggleCatDropdown } from './ui/categories.js';
import { initDesktopSidebar, toggleDesktopSidebar, updateResponsiveAppView } from './ui/layout.js';
import { initModules, toggleBillPaid, addSubscription, removeSubscription, editSubscription, addStockItem, removeStockItem, changeStockQty, addLimit, removeLimit, editLimit, addBill, removeBill, editBill, addCategory, editCategory, removeCategory } from './ui/modules.js';
import { closeModal, closeModalOutside, confirmTx, confirmTxAudio, openModal, setModalType, editTx, dismissAudioTip, pressAmountKey, finishAmountEntry, openAmountKeypad } from './ui/modal.js';
import { openFeedbackModal, setFeedbackType, updateFeedbackCounter } from './ui/feedback-modal.js';
import { onbNext, onbSkip, restartOnboarding } from './ui/onboarding.js';
import { changeMonth, closeFab, goDesktopPage, goMobilePage, toggleFab, toggleMonthPicker, pickYear, pickMonth, closeMonthPicker } from './ui/navigation.js';
import { setTxSearch, setTxFilter, setTxGrouped, openTxHistory, closeTxHistory, setDashView, toggleDashViewDropdown, selectExpenseHeatmapDay, toggleReportBlock } from './ui/render.js';

window.loginGoogle = loginGoogle;
window.confirmLogout = confirmLogout;
window.executeLogout = executeLogout;
window.toggleTheme = toggleTheme;
window.togglePrivacy = togglePrivacy;
window.delTx = removeTransaction;
window.editTx = editTx;
window.openModal = openModal;
window.closeModal = closeModal;
window.closeModalOutside = closeModalOutside;
window.setModalType = setModalType;
window.dismissAudioTip = dismissAudioTip;
window.confirmTx = confirmTx;
window.confirmTxAudio = confirmTxAudio;
window.pressAmountKey = pressAmountKey;
window.finishAmountEntry = finishAmountEntry;
window.openAmountKeypad = openAmountKeypad;
window.openFeedbackModal = openFeedbackModal;
window.setFeedbackType = setFeedbackType;
window.updateFeedbackCounter = updateFeedbackCounter;
window.onbNext = onbNext;
window.onbSkip = onbSkip;
window.restartOnboarding = restartOnboarding;
window.pickCat = pickCategory;
window.toggleCatDropdown = toggleCatDropdown;
window.openInlineCatInput = openInlineCatInput;
window.cancelInlineCatInput = cancelInlineCatInput;
window.saveInlineCategory = saveInlineCategory;
window.handleMic = handleMic;
window.toggleFab = toggleFab;
window.goMPage = goMobilePage;
window.goDPage = goDesktopPage;
window.changeMonth = changeMonth;
window.toggleMonthPicker = toggleMonthPicker;
window.pickYear = pickYear;
window.pickMonth = pickMonth;
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
// Feature: Categorias Dinâmicas
window.addCategory = addCategory;
window.editCategory = editCategory;
window.removeCategory = removeCategory;
// Feature: Busca + Filtros
window.setTxSearch = setTxSearch;
window.setTxFilter = setTxFilter;
// Feature: Histórico por Descrição
window.openTxHistory = openTxHistory;
window.closeTxHistory = closeTxHistory;
// Feature: Visão do Dashboard
window.setDashView = setDashView;
window.toggleDashViewDropdown = toggleDashViewDropdown;
// Feature: Agrupamento de transações
window.setTxGrouped = setTxGrouped;
window.selectExpenseHeatmapDay = selectExpenseHeatmapDay;
window.toggleReportBlock = toggleReportBlock;

initTheme();
initPrivacy();
initDesktopSidebar();
initModules();
initAuth();

window.addEventListener('resize', updateResponsiveAppView);
document.addEventListener('click', (event) => {
  const fabWrap = document.getElementById('fabWrap');
  if (fabWrap && !fabWrap.contains(event.target)) {
    closeFab();
  }
  // Fecha dropdown do seletor de visão ao clicar fora
  if (!event.target.closest('.dash-view-selector')) {
    document.querySelectorAll('.dash-view-dropdown.open').forEach((d) => d.classList.remove('open'));
  }
  // Fecha o seletor de mês ao clicar fora
  if (!event.target.closest('.m-monthpick')) {
    closeMonthPicker();
  }
});
