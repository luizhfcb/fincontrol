import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../css/main.css', import.meta.url), 'utf8');
const navigation = await readFile(new URL('../js/ui/navigation.js', import.meta.url), 'utf8');

test('mobile navbar orders primary destinations around the centered FAB', () => {
  const nav = html.match(/<nav class="m-bottomnav">([\s\S]*?)<\/nav>/)?.[1] ?? '';
  assert.deepEqual([...nav.matchAll(/id="mn-([^"]+)"/g)].map((match) => match[1]), [
    'home', 'transactions', 'bills', 'more',
  ]);
  assert.doesNotMatch(nav, /id="mn-limits"/);
  assert.doesNotMatch(nav, /id="mn-stock"/);
});

test('More hub links to Categories and Stock', () => {
  assert.match(html, /id="mp-more"/);
  assert.match(html, /class="more-hub-card" onclick="goMPage\('limits'\)"/);
  assert.match(html, /class="more-hub-card" onclick="goMPage\('stock'\)"/);
});

test('secondary mobile pages keep More selected', () => {
  assert.match(navigation, /const morePages = new Set\(\['limits', 'stock', 'subscriptions'\]\)/);
  assert.match(navigation, /const navName = morePages\.has\(name\) \? 'more' : name/);
  assert.match(navigation, /`mn-\$\{navName\}`/);
});

test('light summary cards and navbar use symmetric mobile geometry', () => {
  assert.match(css, /\.m-inout-row\s*\{[^}]*repeat\(2,minmax\(0,1fr\)\)/s);
  assert.match(css, /\.m-inout\s*\{[^}]*min-width:0[^}]*width:100%/s);
  assert.match(css, /#mn-home\s*\{\s*grid-column:1/);
  assert.match(css, /#mn-transactions\s*\{\s*grid-column:2/);
  assert.match(css, /#mn-bills\s*\{\s*grid-column:4/);
  assert.match(css, /#mn-more\s*\{\s*grid-column:5/);
  assert.match(css, /\.fab-wrap\s*\{[^}]*left:50%[^}]*right:auto[^}]*translateX\(-50%\)/s);
});
