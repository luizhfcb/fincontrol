// Helpers visuais compartilhados entre os módulos de UI (lista, heatmap,
// gráficos, histórico). Sem estado próprio — só funções puras e constantes.
import { CATEGORY_COLORS } from '../core/constants.js';

// Cores vívidas e distintas p/ composição do dia — legíveis em tema claro E escuro
export const COMPO_PALETTE = [
  '#29D6FF', '#FF6B6B', '#FFD166', '#06D6A0',
  '#A78BFA', '#F78C6B', '#4ADE80', '#F472B6',
  '#38BDF8', '#FBBF24', '#22D3EE', '#FB7185',
];

export const WEEKDAY_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

/** Cor da categoria: mapa fixo p/ conhecidas, hash estável p/ dinâmicas. */
export function catColor(name) {
  if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return COMPO_PALETTE[h % COMPO_PALETTE.length];
}

/** Seta SVG para transação individual (income=verde/cima, expense=vermelho/baixo) */
export function txTypeIcon(type) {
  if (type === 'income') {
    return '<svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>';
  }
  return '<svg viewBox="0 0 24 24"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>';
}

export function formatDateTime(value) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).replace(',', ' ·');
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
