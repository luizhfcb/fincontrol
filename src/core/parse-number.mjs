/**
 * Faz o parse de números em formato pt-BR ("5.000,00", "5000,5") ou decimal
 * com ponto ("123.45"). Retorna NaN quando a entrada é inválida.
 */
export function parsePtBrNumber(raw) {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : NaN;
  }
  if (raw === null || raw === undefined || typeof raw !== 'string') {
    return NaN;
  }

  let s = raw.trim();
  if (!s) return NaN;

  s = s.replace(/^R\$\s*/i, '').trim();
  if (!s) return NaN;

  let sign = 1;
  if (s.startsWith('-')) {
    sign = -1;
    s = s.slice(1).trim();
  } else if (s.startsWith('+')) {
    s = s.slice(1).trim();
  }

  if (!s || !/^[\d.,]+$/.test(s)) return NaN;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  let normalized;
  if (hasComma && hasDot) {
    if (/^\d{1,3}(?:\.\d{3})+,\d+$/.test(s)) {
      normalized = s.replace(/\./g, '').replace(',', '.');
    } else if (/^\d{1,3}(?:,\d{3})+\.\d+$/.test(s)) {
      normalized = s.replace(/,/g, '');
    } else {
      return NaN;
    }
  } else if (hasComma) {
    if (!/^(?:\d+,\d+|,\d+)$/.test(s)) return NaN;
    normalized = s.replace(',', '.');
  } else if (hasDot) {
    const dotCount = (s.match(/\./g) || []).length;
    if (dotCount === 1) {
      if (!/^(?:\d+\.\d+|\.\d+)$/.test(s)) return NaN;
      normalized = s;
    } else {
      if (!/^\d{1,3}(?:\.\d{3}){2,}$/.test(s)) return NaN;
      normalized = s.replace(/\./g, '');
    }
  } else {
    if (!/^\d+$/.test(s)) return NaN;
    normalized = s;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return NaN;
  const result = sign * parsed;
  return Object.is(result, -0) ? 0 : result;
}
