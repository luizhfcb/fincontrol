import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const charts = await readFile(new URL('../js/ui/charts.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../css/main.css', import.meta.url), 'utf8');

test('donut renders as SVG arcs, not conic-gradient', () => {
  assert.doesNotMatch(charts, /conic-gradient/);
  assert.match(charts, /stroke-dasharray/);
  assert.match(charts, /donut-svg/);
  assert.match(charts, /class="donut-arc-hit"[\s\S]*stroke-width="44"/);
});

test('animation is staggered and respects reduced motion', () => {
  assert.match(charts, /animation-delay/);
  assert.match(css, /prefers-reduced-motion/);
});
