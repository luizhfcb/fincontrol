export const state = {
  selectedCategory: 'Outros',
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  transactions: [],
  isRecording: false,
  unsubscribe: null,
  unsubscribeModules: null,
  currentUser: null,
  modalType: 'income',
  modules: null,
};
