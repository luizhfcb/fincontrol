import test from 'node:test';
import assert from 'node:assert/strict';

let buildDashboardComparison = () => null;
try {
  ({ buildDashboardComparison } = await import('../js/core/dashboard-comparison.mjs'));
} catch {}

test('builds a labeled positive comparison against the previous month', () => {
  assert.deepEqual(buildDashboardComparison(300, 100, 'Abril'), {
    percent: 200,
    deltaText: '+200%',
    contextText: 'vs. abril',
    tone: 'up',
  });
});

test('returns null when the previous month has no comparison base', () => {
  assert.equal(buildDashboardComparison(300, 0, 'Abril'), null);
});

test('labels a negative comparison without a redundant plus sign', () => {
  assert.deepEqual(buildDashboardComparison(50, 100, 'Abril'), {
    percent: -50,
    deltaText: '-50%',
    contextText: 'vs. abril',
    tone: 'down',
  });
});
