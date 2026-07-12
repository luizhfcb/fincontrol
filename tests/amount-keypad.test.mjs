import test from 'node:test';
import assert from 'node:assert/strict';

let createAmountState = () => ({});
let pressAmountKey = () => ({});
let getAmountValue = () => 0;
let formatAmountDisplay = () => '';
try {
  ({ createAmountState, pressAmountKey, getAmountValue, formatAmountDisplay } = await import('../js/core/amount-keypad.mjs'));
} catch {}

function enter(keys, initial = createAmountState()) {
  return keys.reduce((state, key) => pressAmountKey(state, key), initial);
}

test('enters a decimal amount with the custom keypad', () => {
  const state = enter(['1', '2', ',', '5']);
  assert.equal(getAmountValue(state), 12.5);
  assert.equal(formatAmountDisplay(state), '12,50');
});

test('calculates a simple expression without eval', () => {
  const state = enter(['1', '2', '+', '3', '=']);
  assert.equal(getAmountValue(state), 15);
  assert.equal(formatAmountDisplay(state), '15,00');
});

test('supports backspace and clear', () => {
  const edited = enter(['9', '8', 'backspace']);
  assert.equal(getAmountValue(edited), 9);
  assert.equal(getAmountValue(pressAmountKey(edited, 'clear')), 0);
});

test('keeps the previous value when dividing by zero', () => {
  const state = enter(['8', '÷', '0', '=']);
  assert.equal(getAmountValue(state), 8);
  assert.equal(state.error, 'Não é possível dividir por zero');
});
