export const state = {
  selectedCategory: 'Outros',
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  transactions: [],
  transactionsLoaded: false,
  isRecording: false,
  unsubscribe: null,
  unsubscribeModules: null,
  modulesDocId: null,
  currentUser: null,
  modalType: 'income',
  modules: null,
};
