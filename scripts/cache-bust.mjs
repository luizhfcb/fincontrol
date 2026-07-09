/**
 * Cache-busting automático baseado em conteúdo (sem bundler).
 *
 * Calcula um hash do conteúdo de CSS/JS/fontes e grava esse hash em:
 *   - index.html: ?v=<hash> nos <link>/<script> de main.css e main.js
 *   - sw.js:      CACHE_NAME = 'fincontrol-static-<hash>'
 *
 * Assim o navegador e o service worker só rebaixam quando algo muda de fato,
 * e você nunca esquece de trocar a versão na mão. Rode antes de publicar:
 *   npm run cache-bust
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve('.');

function walk(dir, exts, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, exts, acc);
    else if (exts.some((e) => entry.endsWith(e))) acc.push(full);
  }
  return acc;
}

// Fontes que compõem o hash (tudo que é precacheado e muda entre deploys).
const files = [
  join(root, 'css', 'main.css'),
  join(root, 'assets', 'fonts', 'poppins.css'),
  ...walk(join(root, 'js'), ['.js', '.mjs']).sort(),
];

const hash = createHash('sha256');
for (const f of files) hash.update(readFileSync(f));
const version = hash.digest('hex').slice(0, 8);

// index.html: ?v=<hash> em main.css e main.js
const indexPath = join(root, 'index.html');
let html = readFileSync(indexPath, 'utf8');
html = html
  .replace(/(\.\/css\/main\.css)(\?v=[^"']*)?/g, `$1?v=${version}`)
  .replace(/(\.\/js\/main\.js)(\?v=[^"']*)?/g, `$1?v=${version}`);
writeFileSync(indexPath, html);

// sw.js: CACHE_NAME
const swPath = join(root, 'sw.js');
let sw = readFileSync(swPath, 'utf8');
sw = sw.replace(/const CACHE_NAME = '[^']*';/, `const CACHE_NAME = 'fincontrol-static-${version}';`);
writeFileSync(swPath, sw);

console.log(`cache-bust: versão ${version} aplicada em index.html e sw.js (${files.length} arquivos no hash)`);
