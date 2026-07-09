import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

import { toLocalDateInputValue, parseLocalDateInput } from '../js/core/local-date.mjs';

test('data local continua no dia 9 à noite em São Paulo (sem drift UTC)', () => {
  const source = `
    import { toLocalDateInputValue } from './js/core/local-date.mjs';
    console.log(toLocalDateInputValue(new Date('2026-07-10T01:30:00.000Z')));
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', source], {
    cwd: process.cwd(),
    env: { ...process.env, TZ: 'America/Sao_Paulo' },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), '2026-07-09');
});

test('toLocalDateInputValue devolve string vazia para data inválida', () => {
  assert.equal(toLocalDateInputValue(new Date('invalid')), '');
  assert.equal(toLocalDateInputValue('nada'), '');
});

test('parseLocalDateInput rejeita datas inexistentes em vez de rolar o dia', () => {
  assert.equal(parseLocalDateInput('2026-02-31'), null);
  assert.equal(parseLocalDateInput('invalid'), null);
});

test('parseLocalDateInput herda a hora do timeSource', () => {
  const t = new Date(2026, 0, 1, 14, 30, 5, 0);
  const d = parseLocalDateInput('2026-07-09', t);
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 6);
  assert.equal(d.getDate(), 9);
  assert.equal(d.getHours(), 14);
  assert.equal(d.getMinutes(), 30);
});
