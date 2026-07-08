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
  // Feature: busca por descrição em tempo real
  txSearchQuery: '',
  // Feature: filtro de tipo ('all' | 'income' | 'expense')
  txTypeFilter: 'all',
  // Feature: descrição selecionada para exibir histórico detalhado
  selectedTxDesc: null,
  // Feature: visão do dashboard ('all' | 'income' | 'expense')
  dashView: 'all',
  // Feature: agrupar transações por categoria (false = lista plana)
  txGrouped: false,
  // Feature: edição de transações
  editingTxId: null,
  // Feature: dia selecionado no mapa de calor de despesas
  heatmapSelectedDay: new Date().getDate(),
  // Feature: blocos de relatório expansíveis (false = minimizado)
  heatmapExpanded: false,
  chartExpanded: false,
};
