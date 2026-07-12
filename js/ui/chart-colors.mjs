export const EXPENSE_PALETTE = [
  '#14B8A6', '#F43F5E', '#29D6FF', '#A855F7', '#F59E0B', '#84CC16',
  '#EC4899', '#6366F1', '#F97316', '#06B6D4', '#22C55E', '#8B5CF6',
];

export const INCOME_PALETTE = [
  '#22C55E', '#29D6FF', '#A855F7', '#F59E0B', '#14B8A6', '#EC4899',
  '#84CC16', '#6366F1', '#F97316', '#06B6D4', '#F43F5E', '#8B5CF6',
];

function normalize(color) {
  return String(color || '').trim().toLowerCase();
}

function generatedColor(index, isIncome) {
  const offset = isIncome ? 142 : 188;
  const hue = Math.round((offset + index * 137.508) % 360);
  const saturation = 66 + (index % 3) * 5;
  const lightness = 44 + (index % 4) * 4;
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

export function assignDistinctDonutColors(categories, isIncome = false, fixedColors = {}) {
  const palette = isIncome ? INCOME_PALETTE : EXPENSE_PALETTE;
  const used = new Set();

  return categories.map((category, index) => {
    const preferred = fixedColors[category];
    let color = preferred && !used.has(normalize(preferred)) ? preferred : null;

    if (!color) color = palette.find((candidate) => !used.has(normalize(candidate))) || null;

    let generatedIndex = index;
    while (!color || used.has(normalize(color))) {
      color = generatedColor(generatedIndex, isIncome);
      generatedIndex += 1;
    }

    used.add(normalize(color));
    return color;
  });
}
