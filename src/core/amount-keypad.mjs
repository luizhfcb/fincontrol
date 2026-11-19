const OPERATORS = new Set(['+', '−', '-', '×', '÷']);

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toNumber(raw) {
  const value = Number(String(raw || '0').replace(',', '.'));
  return Number.isFinite(value) ? value : 0;
}

function toRaw(value) {
  const rounded = roundCurrency(Number(value) || 0);
  return String(rounded).replace('.', ',');
}

function calculate(left, right, operator) {
  if (operator === '+') return { value: left + right };
  if (operator === '−' || operator === '-') return { value: left - right };
  if (operator === '×') return { value: left * right };
  if (operator === '÷') {
    if (right === 0) return { error: 'Não é possível dividir por zero' };
    return { value: left / right };
  }
  return { value: right };
}

export function createAmountState(value = 0) {
  return {
    current: toRaw(Math.max(0, Number(value) || 0)),
    stored: null,
    operator: null,
    replace: false,
    error: '',
  };
}

export function getAmountValue(state) {
  return Math.max(0, roundCurrency(toNumber(state?.current)));
}

export function formatAmountDisplay(state) {
  return getAmountValue(state).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatAmountExpression(state) {
  if (state?.stored === null || !state?.operator) return '';
  const left = Number(state.stored).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  return `${left} ${state.operator}`;
}

export function pressAmountKey(state, key) {
  const currentState = state || createAmountState();
  const normalizedKey = String(key);

  if (/^\d$/.test(normalizedKey)) {
    let current = currentState.replace ? normalizedKey : currentState.current;
    if (!currentState.replace) {
      const [integer = '0', decimal] = current.split(',');
      if (decimal !== undefined) {
        if (decimal.length >= 2) return { ...currentState, error: '' };
        current = `${integer},${decimal}${normalizedKey}`;
      } else if (integer.length < 9) {
        current = integer === '0' ? normalizedKey : `${integer}${normalizedKey}`;
      }
    }
    return { ...currentState, current, replace: false, error: '' };
  }

  if (normalizedKey === ',') {
    const current = currentState.replace
      ? '0,'
      : currentState.current.includes(',') ? currentState.current : `${currentState.current},`;
    return { ...currentState, current, replace: false, error: '' };
  }

  if (normalizedKey === 'backspace') {
    if (currentState.replace) return { ...currentState, error: '' };
    const shortened = currentState.current.slice(0, -1);
    return { ...currentState, current: shortened && shortened !== '-' ? shortened : '0', error: '' };
  }

  if (normalizedKey === 'clear') return createAmountState();

  if (OPERATORS.has(normalizedKey)) {
    const currentValue = getAmountValue(currentState);
    if (currentState.operator && currentState.stored !== null && !currentState.replace) {
      const result = calculate(currentState.stored, currentValue, currentState.operator);
      if (result.error) return { ...currentState, error: result.error };
      return {
        current: toRaw(result.value),
        stored: roundCurrency(result.value),
        operator: normalizedKey,
        replace: true,
        error: '',
      };
    }
    return {
      ...currentState,
      stored: currentValue,
      operator: normalizedKey,
      replace: true,
      error: '',
    };
  }

  if (normalizedKey === '=' && currentState.operator && currentState.stored !== null) {
    const result = calculate(currentState.stored, getAmountValue(currentState), currentState.operator);
    if (result.error) {
      return {
        ...createAmountState(currentState.stored),
        replace: true,
        error: result.error,
      };
    }
    return {
      ...createAmountState(result.value),
      replace: true,
    };
  }

  return currentState;
}
