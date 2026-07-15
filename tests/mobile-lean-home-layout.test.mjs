import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const home = html.match(/<div class="m-page active" id="mp-home">([\s\S]*?)<div class="m-page" id="mp-/)?.[1] ?? '';

test('hero keeps only balance plus inline income/expense pills', () => {
  assert.match(home, /class="m-inout-pills"/);
  assert.doesNotMatch(home, /class="m-flow-card"/);
  assert.doesNotMatch(home, /id="mBalanceDelta"/);
  assert.doesNotMatch(home, /id="mBalanceComparison"/);
});

test('category donut is always visible on home', () => {
  assert.match(home, /id="mBarChart"/);
  assert.doesNotMatch(home, /id="mChartHeader"/);
  assert.doesNotMatch(home, /collapse-shell/);
});

test('home shows recent transactions and no reports', () => {
  assert.match(home, /id="mRecentTx"/);
  assert.match(home, /onclick="goMPage\('transactions'\)"/);
  for (const id of ['mExpenseHeatmap', 'mWeekdayChart', 'mSixMonthChart', 'mLimitsMini', 'mDays']) {
    assert.doesNotMatch(home, new RegExp(`id="${id}"`));
  }
});
