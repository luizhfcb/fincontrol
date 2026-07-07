export const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Saúde',
  'Lazer',
  'Casa',
  'Trabalho',
  'Outros',
];

export const CATEGORY_ICONS = {
  Alimentação: '🍽️',
  Transporte: '🚗',
  Saúde: '💊',
  Lazer: '🎮',
  Casa: '🏠',
  Trabalho: '💼',
  Assinaturas: '💳',
  'Despesa Fixa': '🧾',
  Combustível: '⛽',
  Manutenção: '🔧',
  Fornecedor: '📦',
  'Venda de Água': '💧',
  Entrega: '🚚',
  Outros: '📦',
};

export const CATEGORY_COLORS = {
  Alimentação: '#22c55e',
  Transporte: '#38bdf8',
  Saúde: '#f97316',
  Lazer: '#f59e0b',
  Casa: '#3426a4',
  Trabalho: '#271b87',
  Outros: '#180f68',
};

/** Categorias pré-definidas para distribuidora de água */
export const DEFAULT_WATER_CATEGORIES = [
  { id: 'dw-1',  name: 'Combustível',   type: 'expense' },
  { id: 'dw-2',  name: 'Manutenção',    type: 'expense' },
  { id: 'dw-3',  name: 'Motorista 1',   type: 'expense' },
  { id: 'dw-4',  name: 'Motorista 2',   type: 'expense' },
  { id: 'dw-5',  name: 'Caminhão A',    type: 'expense' },
  { id: 'dw-6',  name: 'Caminhão B',    type: 'expense' },
  { id: 'dw-7',  name: 'Fornecedor',    type: 'expense' },
  { id: 'dw-8',  name: 'Venda de Água', type: 'income'  },
  { id: 'dw-9',  name: 'Entrega',       type: 'income'  },
  { id: 'dw-10', name: 'Outros',        type: 'expense' },
];
