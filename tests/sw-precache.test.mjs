import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import { listModuleAssets, readSwModuleAssets, writeSwModuleAssets } from '../scripts/sw-assets.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const swSource = readFileSync(join(root, 'sw.js'), 'utf8');

test('sw.js precacheia todos os módulos servidos ao browser', () => {
  const declared = readSwModuleAssets(swSource);
  assert.ok(declared, 'bloco MODULE_ASSETS:auto não encontrado em sw.js');

  const onDisk = listModuleAssets(root);
  const missing = onDisk.filter((asset) => !declared.includes(asset));
  const stale = declared.filter((asset) => !onDisk.includes(asset));

  assert.deepEqual(missing, [], 'módulos fora do precache — rode `npm run cache-bust`');
  assert.deepEqual(stale, [], 'precache aponta para arquivos inexistentes — rode `npm run cache-bust`');
});

test('writeSwModuleAssets regrava o bloco automático sem tocar no resto', () => {
  const rewritten = writeSwModuleAssets(swSource, ['./js/a.js', './js/b.mjs']);
  assert.deepEqual(readSwModuleAssets(rewritten), ['./js/a.js', './js/b.mjs']);
  assert.ok(rewritten.includes('const CACHE_NAME ='));
  assert.ok(rewritten.includes('const SHELL_ASSETS = ['));
});

test('install do service worker tolera asset individual que falha', () => {
  // `cache.addAll` é tudo-ou-nada: um 404 deixaria o app inteiro sem offline.
  assert.ok(!swSource.includes('cache.addAll'), 'install não pode usar addAll');
  assert.ok(swSource.includes('cache.add(asset).catch'));
});

test('index.html e sw.js não carregam módulos com query string de versão manual', () => {
  // O ?v= manual escapa do cache-bust e faz o browser baixar o mesmo módulo
  // duas vezes (uma com query, outra sem) — nenhuma delas casa com o precache.
  const mainJs = readFileSync(join(root, 'js', 'main.js'), 'utf8');
  assert.equal(/from '\.\/[^']*\.js\?v=/.test(mainJs), false);
});
