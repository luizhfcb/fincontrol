export const state = {
  selectedCategory: 'Outros',
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  transactions: [],
  isRecording: false,
  unsubscribe: null,
  currentUser: null,
  modalType: 'income',
};
