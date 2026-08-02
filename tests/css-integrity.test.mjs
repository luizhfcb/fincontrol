import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../css/main.css', import.meta.url), 'utf8');

// Um `url(` sem fechar mantém o valor aberto e o parser do browser descarta
// TODO o resto do arquivo em silêncio — foi assim que ~8.000 linhas de estilo
// pararam de aplicar sem nenhum erro visível.
test('every url( in the stylesheet is closed', () => {
  const unclosed = [];
  css.split('\n').forEach((line, index) => {
    let cursor = 0;
    while (true) {
      const start = line.indexOf('url(', cursor);
      if (start === -1) break;
      if (line.indexOf(')', start) === -1) {
        unclosed.push(`${index + 1}: ${line.slice(start, start + 60)}`);
      }
      cursor = start + 4;
    }
  });
  assert.deepEqual(unclosed, []);
});

test('braces are balanced across the stylesheet', () => {
  let depth = 0;
  for (const char of css) {
    if (char === '{') depth += 1;
    else if (char === '}') depth -= 1;
    assert.ok(depth >= 0, 'closing brace without a matching opening brace');
  }
  assert.equal(depth, 0);
});
