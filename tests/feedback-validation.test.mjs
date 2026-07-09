import test from 'node:test';
import assert from 'node:assert/strict';

import { validateFeedbackPayload } from '../js/core/feedback-validation.mjs';

test('validateFeedbackPayload rejects invalid type', () => {
  const result = validateFeedbackPayload({ type: 'complaint', message: 'oi' });
  assert.equal(result.valid, false);
});

test('validateFeedbackPayload rejects empty message', () => {
  const result = validateFeedbackPayload({ type: 'bug', message: '   ' });
  assert.equal(result.valid, false);
});

test('validateFeedbackPayload rejects message over 2000 chars', () => {
  const result = validateFeedbackPayload({ type: 'bug', message: 'a'.repeat(2001) });
  assert.equal(result.valid, false);
});

test('validateFeedbackPayload accepts valid bug payload', () => {
  const result = validateFeedbackPayload({ type: 'bug', message: 'App trava ao abrir.' });
  assert.equal(result.valid, true);
});

test('validateFeedbackPayload accepts valid suggestion payload', () => {
  const result = validateFeedbackPayload({ type: 'suggestion', message: 'Adicionar filtro por data.' });
  assert.equal(result.valid, true);
});
