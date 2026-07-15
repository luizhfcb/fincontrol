import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const navigation = await readFile(new URL('../js/ui/navigation.js', import.meta.url), 'utf8');

test('navbar orders Início, Transações, Análises, Mais around the FAB', () => {
  const nav = html.match(/<nav class="m-bottomnav">([\s\S]*?)<\/nav>/)?.[1] ?? '';
  assert.deepEqual([...nav.matchAll(/id="mn-([^"]+)"/g)].map((m) => m[1]), [
    'home', 'transactions', 'analytics', 'more',
  ]);
});

test('analytics page hosts the relocated report containers', () => {
  const page = html.match(/<div class="m-page" id="mp-analytics">([\s\S]*?)<div class="m-page" id="mp-/)?.[1] ?? '';
  for (const id of ['maPeriodFilter', 'maDailyChart', 'maBreakdown', 'mExpenseHeatmap',
    'mWeekdayChart', 'mSixMonthChart', 'mLimitsMini', 'maIncomeTotal', 'maOutflowTotal']) {
    assert.match(page, new RegExp(`id="${id}"`));
  }
  assert.match(page, /onkeydown="handleAnalyticsPeriodKey\(event\)"/);
});

test('bills lives in the More hub and keeps More active', () => {
  assert.match(html, /class="more-hub-card" onclick="goMPage\('bills'\)"/);
  assert.match(navigation, /morePages = new Set\(\['limits', 'stock', 'subscriptions', 'bills'\]\)/);
});
