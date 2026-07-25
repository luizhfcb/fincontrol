import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import { escapeHtml } from '../js/core/escape-html.mjs';
import { renderMobileStockModule } from '../js/ui/mobile-module-templates.mjs';
import { renderDesktopStockModule } from '../js/ui/desktop-module-templates.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('escapa os cinco caracteres que quebram um atributo ou tag', () => {
  assert.equal(escapeHtml('<img src=x onerror="a">'), '&lt;img src=x onerror=&quot;a&quot;&gt;');
  assert.equal(escapeHtml("it's & that"), 'it&#39;s &amp; that');
});

test('valores nulos viram string vazia em vez de "null"', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(0), '0');
});

test('templates mobile e desktop escapam nome de item do estoque', () => {
  const stockItems = [{ id: 'x', name: '<script>alert(1)</script>', qty: 0, min: 1, category: 'Casa', price: 10 }];
  for (const html of [
    renderMobileStockModule({ stockItems, alerts: 1 }),
    renderDesktopStockModule({ stockItems, alerts: stockItems }),
  ]) {
    assert.equal(html.includes('<script>alert(1)</script>'), false);
    assert.ok(html.includes('&lt;script&gt;'));
  }
});

test('escapeHtml tem uma implementação só no projeto', () => {
  // Três cópias divergentes eram três chances de uma ficar para trás.
  for (const file of ['js/ui/ui-helpers.js', 'js/ui/desktop-module-templates.mjs', 'js/ui/mobile-module-templates.mjs']) {
    const source = readFileSync(join(root, ...file.split('/')), 'utf8');
    assert.equal(/const escapeHtml =|function escapeHtml\(/.test(source), false, `${file} redefine escapeHtml`);
  }
});
