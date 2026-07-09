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

// Cores vívidas e distintas — legíveis em tema claro E escuro
export const CATEGORY_COLORS = {
  Alimentação: '#22C55E',
  Transporte: '#38BDF8',
  Saúde: '#F97316',
  Lazer: '#A78BFA',
  Casa: '#F472B6',
  Trabalho: '#FBBF24',
  Assinaturas: '#29D6FF',
  'Despesa Fixa': '#FB7185',
  Combustível: '#F59E0B',
  Manutenção: '#94A3B8',
  Fornecedor: '#4ADE80',
  'Venda de Água': '#06D6A0',
  Entrega: '#818CF8',
  Outros: '#9CA3AF',
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
