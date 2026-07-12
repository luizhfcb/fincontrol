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
  Manutenção: '#6366F1',
  Fornecedor: '#4ADE80',
  'Venda de Água': '#06D6A0',
  Entrega: '#818CF8',
  Outros: '#14B8A6',
};

/** Categorias genéricas pré-definidas para contas novas */
export const DEFAULT_CATEGORIES = [
  { id: 'dc-1', name: 'Alimentação', type: 'expense' },
  { id: 'dc-2', name: 'Transporte',  type: 'expense' },
  { id: 'dc-3', name: 'Saúde',       type: 'expense' },
  { id: 'dc-4', name: 'Lazer',       type: 'expense' },
  { id: 'dc-5', name: 'Casa',        type: 'expense' },
  { id: 'dc-6', name: 'Outros',      type: 'expense' },
];
