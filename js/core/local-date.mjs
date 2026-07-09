/**
 * Datas no calendário LOCAL, sem o drift de UTC.
 *
 * `new Date().toISOString().slice(0,10)` devolve a data em UTC — às 21h no
 * horário de Brasília (UTC-3) já virou o dia seguinte. Estes helpers usam
 * getFullYear/getMonth/getDate (local) para o input <input type="date">.
 */
export function toLocalDateInputValue(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converte "YYYY-MM-DD" para Date no fuso local, herdando a hora de timeSource.
 * Rejeita (retorna null) datas inexistentes como 2026-02-31 em vez de rolar
 * para outro dia.
 */
export function parseLocalDateInput(value, timeSource = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (!match || Number.isNaN(timeSource.getTime())) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const result = new Date(
    year, month - 1, day,
    timeSource.getHours(), timeSource.getMinutes(),
    timeSource.getSeconds(), timeSource.getMilliseconds(),
  );
  if (result.getFullYear() !== year || result.getMonth() !== month - 1 || result.getDate() !== day) {
    return null;
  }
  return result;
}
