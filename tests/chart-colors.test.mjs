import test from 'node:test';
import assert from 'node:assert/strict';

let assignDistinctDonutColors = () => [];
try {
  ({ assignDistinctDonutColors } = await import('../js/ui/chart-colors.mjs'));
} catch {}

test('avoids collision between a fixed and fallback donut color', () => {
  const colors = assignDistinctDonutColors(['Assinaturas', 'Teste'], false, {
    Assinaturas: '#29D6FF',
  });
  assert.equal(new Set(colors.map((color) => color.toLowerCase())).size, 2);
});

test('resolves duplicated fixed colors and stays deterministic', () => {
  const fixed = { A: '#29D6FF', B: '#29D6FF' };
  const first = assignDistinctDonutColors(['A', 'B', 'C'], false, fixed);
  const second = assignDistinctDonutColors(['A', 'B', 'C'], false, fixed);
  assert.equal(new Set(first.map((color) => color.toLowerCase())).size, 3);
  assert.deepEqual(first, second);
});

test('keeps colors unique after the base palette is exhausted', () => {
  const categories = Array.from({ length: 30 }, (_, index) => `Categoria ${index}`);
  const colors = assignDistinctDonutColors(categories, false, {});
  assert.equal(new Set(colors.map((color) => color.toLowerCase())).size, categories.length);
});
