import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => readFileSync(join(root, ...parts), 'utf8');

const html = read('index.html');
const dialog = read('js', 'ui', 'dialog.js');
const navigation = read('js', 'ui', 'navigation.js');
const txHistory = read('js', 'ui', 'tx-history.js');

test('todo overlay de diálogo é anunciado como dialog e tem título associado', () => {
  const boxes = [
    ...html.matchAll(/<div class="modal-box[^"]*"[^>]*>/g),
    ...html.matchAll(/<div class="audio-tip-card"[^>]*>/g),
  ].map((match) => match[0]);

  assert.ok(boxes.length >= 4, `esperava ao menos 4 caixas de diálogo, achei ${boxes.length}`);
  for (const box of boxes) {
    assert.ok(box.includes('role="dialog"'), `sem role="dialog": ${box.slice(0, 80)}`);
    assert.ok(box.includes('aria-modal="true"'), `sem aria-modal: ${box.slice(0, 80)}`);
    assert.match(box, /aria-labelledby="\w+"/, `sem aria-labelledby: ${box.slice(0, 80)}`);
  }

  // O histórico é montado em JS, então o contrato vale para o template também.
  assert.ok(txHistory.includes('role="dialog"'));
  assert.ok(txHistory.includes('aria-labelledby="txHistoryTitle"'));
  assert.ok(txHistory.includes('id="txHistoryTitle"'));
});

test('cada aria-labelledby de diálogo aponta para um id que existe', () => {
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  for (const [, target] of html.matchAll(/aria-labelledby="([^"]+)"/g)) {
    assert.ok(ids.has(target), `aria-labelledby="${target}" não tem elemento correspondente`);
  }
});

test('dialog.js registra todos os overlays do HTML', () => {
  const overlays = [...html.matchAll(/class="(?:modal|audio-tip)-overlay"[^>]*id="([^"]+)"/g)]
    .map((match) => match[1]);
  assert.ok(overlays.length >= 5, `esperava ao menos 5 overlays, achei ${overlays.length}`);
  for (const id of overlays) {
    assert.ok(dialog.includes(`'${id}'`), `overlay ${id} não registrado em dialog.js`);
  }
});

test('Escape fecha o diálogo do topo', () => {
  assert.ok(dialog.includes("event.key !== 'Escape'"));
  assert.ok(dialog.includes('openStack[openStack.length - 1]'));
});

test('o toast fica fora da região inerte para seguir sendo anunciado', () => {
  // Conteúdo aria-live dentro de subárvore inerte não é lido: um erro de
  // gravação disparado de dentro do modal ficaria mudo.
  assert.ok(dialog.includes("child.id === 'toast'"));
  assert.match(html, /id="toast"[^>]*aria-live="polite"/);
});

test('menu do FAB nasce inerte e não deixa botões invisíveis no tab order', () => {
  assert.match(html, /class="fab-menu" id="fabMenu" inert/);
  assert.match(html, /id="fabBtn"[^>]*aria-expanded="false"/);
  assert.ok(navigation.includes('menu.inert = !isOpen'));
  assert.ok(navigation.includes("button?.setAttribute('aria-expanded', String(isOpen))"));
});

test('navegação ativa é exposta com aria-current, não só com a classe', () => {
  assert.ok(navigation.includes("setAttribute('aria-current', 'page')"));
  assert.ok(navigation.includes("removeAttribute('aria-current')"));
  // Vale para as duas navegações (mobile .nbtn e desktop .snav-item).
  assert.ok(navigation.includes("setNavCurrent(document.querySelectorAll('.nbtn')"));
  assert.ok(navigation.includes("setNavCurrent(document.querySelectorAll('.snav-item')"));
});

test('o seletor Entrada/Gasto é um radiogroup coerente', () => {
  // Antes era role="tablist" com botões sem role — ARIA quebrada é pior que
  // ARIA nenhuma: o leitor de tela anuncia uma tab list sem tabs.
  assert.ok(html.includes('class="modal-mode" role="radiogroup"'));
  assert.equal(html.includes('role="tablist"'), false);
  for (const id of ['mmIncome', 'mmExpense']) {
    const match = html.match(new RegExp(`<button[^>]*id="${id}"[^>]*>`));
    assert.ok(match, `botão ${id} não encontrado`);
    assert.ok(match[0].includes('role="radio"'), `${id} sem role="radio"`);
    assert.match(match[0], /aria-checked="(true|false)"/, `${id} sem aria-checked`);
  }
  const modal = read('js', 'ui', 'modal.js');
  assert.ok(modal.includes("button.setAttribute('aria-checked', String(checked))"));
});

test('controle do microfone é um button, não uma div clicável', () => {
  assert.match(html, /<button[^>]*id="micBtn"[^>]*aria-label="[^"]+"/);
});

test('index.html declara meta description', () => {
  assert.match(html, /<meta name="description" content="[^"]{40,}">/);
});
