import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const analytics = await readFile(new URL('../js/ui/analytics.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../css/main.css', import.meta.url), 'utf8');
const page = html.match(/<div class="m-page" id="mp-analytics">([\s\S]*?)<div class="m-page" id="mp-/)?.[1] ?? '';

test('analytics reuses the same global topbar as the other mobile tabs', () => {
  assert.match(html, /class="m-topbar"/);
  assert.doesNotMatch(page, /analytics-page-head|maAvatar|analytics-head-action/);
  assert.doesNotMatch(css, /#mobile-app:has\(#mp-analytics\.active\) \.m-topbar\s*\{display:none\}/);
});

test('analytics keeps only the period selector and entry/outflow pair above the chart', () => {
  assert.ok(page.indexOf('id="maPeriodFilter"') < page.indexOf('class="analytics-hero'));
  assert.deepEqual(
    [...page.matchAll(/data-period="(week|month|year|all)"/g)].map((match) => match[1]),
    ['week', 'month', 'year', 'all'],
  );
  assert.match(page, /id="maIncomeTotal"/);
  assert.match(page, /id="maOutflowTotal"/);
  assert.doesNotMatch(page, /maExpenseTotal|maPeriodLabel|mBalanceDelta|analytics-total/);
  assert.doesNotMatch(analytics, /setText\('maExpenseTotal'|buildDashboardComparison/);
});

test('daily analytics chart uses the compact current-series treatment', () => {
  assert.match(analytics, /analytics-chart-head/);
  assert.match(analytics, /analytics-chart-current/);
  assert.match(analytics, /buildWeekdaySpending/);
  assert.doesNotMatch(analytics, /function dailyBuckets/);
  assert.match(css, /\.analytics-daily-card \.fin-bar-fill/);
  assert.match(css, /--analytics-blue/);
});

test('analytics metrics and breakdown use the reference card hierarchy', () => {
  assert.match(css, /\.analytics-secondary > div\s*\{/);
  assert.match(css, /\.analytics-breakdown\s*\{/);
  assert.match(css, /\.breakdown-dot\s*\{/);
  assert.match(css, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css, /\.analytics-period-filter button\.active::after\s*\{display:none\}/);
  assert.match(css, /--analytics-selector:#e9ebef/);
  assert.match(css, /background:var\(--analytics-selector\)/);
});

test('analytics summary cards start immediately after the selector', () => {
  assert.match(css, /\.analytics-secondary\s*\{[\s\S]*?margin-top:0/);
});

test('analytics income and outflow are centered inside distinct cards', () => {
  assert.match(css, /#mp-analytics \.analytics-secondary\s*\{[^}]*max-width:380px[^}]*margin-inline:auto/s);
  assert.match(css, /#mp-analytics \.analytics-secondary > div\s*\{[^}]*align-items:center[^}]*justify-content:center[^}]*border:1px solid var\(--border\)[^}]*background:var\(--card\)/s);
});
