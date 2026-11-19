import { useApp } from '../context/AppContext.jsx';
import { CATEGORY_COLORS } from '../core/constants.js';
import Icon from './Icon.jsx';

const PALETTE = [
  '#38BDF8', '#34D399', '#A78BFA', '#F59E0B', '#FB7185', '#2DD4BF',
  '#818CF8', '#F472B6', '#F97316', '#22D3EE', '#4ADE80', '#C084FC',
];

export const CATEGORY_ICON_CHOICES = [
  { key: '', label: 'Auto' },
  { key: 'utensils', label: 'Alimentação' },
  { key: 'car', label: 'Carro' },
  { key: 'truck', label: 'Caminhão' },
  { key: 'fuel', label: 'Combustível' },
  { key: 'wrench', label: 'Manutenção' },
  { key: 'home', label: 'Casa' },
  { key: 'heart', label: 'Saúde' },
  { key: 'gamepad', label: 'Lazer' },
  { key: 'briefcase', label: 'Trabalho' },
  { key: 'creditCard', label: 'Assinatura' },
  { key: 'receipt', label: 'Conta fixa' },
  { key: 'droplet', label: 'Água' },
  { key: 'box', label: 'Estoque' },
  { key: 'wallet', label: 'Financeiro' },
  { key: 'target', label: 'Meta' },
  { key: 'sparkles', label: 'Extras' },
];

function fold(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const FIXED_LOWER = Object.fromEntries(
  Object.entries(CATEGORY_COLORS).map(([k, v]) => [fold(k), v]),
);

/** Cor estável por categoria (mapa conhecido ou hash consistente para personalizadas). */
export function getCategoryColor(name, type) {
  const key = fold(name);
  if (FIXED_LOWER[key]) return FIXED_LOWER[key];
  if (!key) return type === 'income' ? '#10B981' : '#38BDF8';
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = ((hash * 31) + key.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

/** Mapeamento semântico de categoria para ícone vetorial (null se não houver correspondência). */
export function getCategoryIconName(name, explicitIcon) {
  if (explicitIcon) return explicitIcon;
  const k = fold(name);
  if (/aliment|mercad|almoc|jant|lanch|cafe|restaur|comid|padar|supermerc/.test(k)) return 'utensils';
  if (/caminha|entreg|frete|carga/.test(k)) return 'truck';
  if (/combust|gasolin|etanol|diesel|posto|abastec/.test(k)) return 'fuel';
  if (/motor|manutenc|oficin|peca|mecan|repar|consert/.test(k)) return 'wrench';
  if (/transport|uber|carro|moto|onibus|passag|estacion|pedag/.test(k)) return 'car';
  if (/saud|farmac|medic|hospit|dentist|exame|academia|clinic/.test(k)) return 'heart';
  if (/lazer|cinem|jogo|viag|fest|show|bar|passei|entret/.test(k)) return 'gamepad';
  if (/casa|alugu|luz|energ|internet|condomin|morad|imovel/.test(k)) return 'home';
  if (/trabalh|salar|freel|vend|rend|comiss|empres|client/.test(k)) return 'briefcase';
  if (/assinat|stream|spotif|netfl|prime|cartao|fatura/.test(k)) return 'creditCard';
  if (/fixa|conta|bolet|impost|taxa|tribut/.test(k)) return 'receipt';
  if (/agua|bebid|galao/.test(k)) return 'droplet';
  if (/forneced|estoqu|outro|divers/.test(k)) return 'box';
  if (/invest|poupanc|reserv|banco|meta/.test(k)) return 'wallet';
  return null;
}

/** Monograma limpo (1–2 letras) para categorias customizadas sem ícone definido. */
function getMonogram(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '•';
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return words[0].slice(0, 2).toUpperCase();
}

/**
 * Badge vetorial duotone para categorias.
 * Usa ícone escolhido pelo usuário, ou ícone semântico pelo nome,
 * ou monograma tipográfico (ex.: "TE" para "Teste") — nunca seta aleatória nem emoji.
 */
export default function CategoryBadge({ cat, type, icon, color, size = 'md' }) {
  const ctx = useApp();
  const savedIcon = icon || ctx?.modules?.categories?.find(
    (c) => fold(c.name) === fold(cat),
  )?.icon;

  const resolvedColor = color || getCategoryColor(cat, type);
  const iconName = getCategoryIconName(cat, savedIcon);
  const px = size === 'sm' ? 14 : size === 'xs' ? 13 : 18;

  return (
    <span
      className={`cat-badge cat-badge-${size}`}
      style={{
        color: resolvedColor,
        background: `${resolvedColor}1A`,
        borderColor: `${resolvedColor}38`,
      }}
      aria-hidden="true"
    >
      {iconName ? (
        <Icon name={iconName} size={px} />
      ) : (
        <span className="cat-monogram">{getMonogram(cat)}</span>
      )}
    </span>
  );
}
