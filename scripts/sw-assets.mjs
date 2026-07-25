/**
 * Fonte única da lista de módulos precacheados pelo service worker.
 *
 * O bloco `MODULE_ASSETS:auto` do sw.js é gerado a partir daqui por
 * `npm run cache-bust`, e o teste `tests/sw-precache.test.mjs` falha se o
 * arquivo sair de sincronia. Antes disso a lista era mantida na mão e módulos
 * novos ficavam de fora do precache — o app quebrava offline em silêncio.
 */
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

// `\r?\n` em vez de `\n`: o repositório é editado no Windows e o sw.js pode
// estar com CRLF — com `\n` puro o bloco não casava e a geração virava no-op.
const AUTO_BLOCK = /(\/\/ >>> MODULE_ASSETS:auto[\s\S]*?const MODULE_ASSETS = \[\r?\n)([\s\S]*?)(\];\r?\n\/\/ <<< MODULE_ASSETS:auto)/;

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir).sort()) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.m?js$/.test(entry)) acc.push(full);
  }
  return acc;
}

/** Todos os módulos servidos ao browser, como caminhos `./js/...` ordenados. */
export function listModuleAssets(root) {
  return walk(join(root, 'js'))
    .map((file) => `./${relative(root, file).split(sep).join('/')}`)
    .sort();
}

/** Caminhos declarados hoje no bloco automático do sw.js. */
export function readSwModuleAssets(swSource) {
  const match = swSource.match(AUTO_BLOCK);
  if (!match) return null;
  return match[2]
    .split('\n')
    .map((line) => line.trim().replace(/^'|',$|'$/g, ''))
    .filter(Boolean);
}

/**
 * Reescreve o bloco automático do sw.js com a lista informada.
 * Lança se o bloco sumir — silenciosamente não gerar nada é exatamente o
 * modo de falha que este arquivo existe para eliminar.
 */
export function writeSwModuleAssets(swSource, assets) {
  if (!AUTO_BLOCK.test(swSource)) {
    throw new Error('sw.js: bloco MODULE_ASSETS:auto não encontrado — precache não pôde ser gerado');
  }
  const eol = swSource.includes('\r\n') ? '\r\n' : '\n';
  const body = assets.map((asset) => `  '${asset}',`).join(eol);
  return swSource.replace(AUTO_BLOCK, `$1${body}${eol}$3`);
}
