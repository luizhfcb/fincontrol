import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../css/main.css', import.meta.url), 'utf8');
const modal = await readFile(new URL('../js/ui/modal.js', import.meta.url), 'utf8');
const main = await readFile(new URL('../js/main.js', import.meta.url), 'utf8');

const transactionModal = html.match(/<div class="modal-overlay" id="modalOverlay"[\s\S]*?<\/div>\s*<!-- Dica de áudio/)?.[0] ?? '';

test('transaction type and input method are separate choices', () => {
  const mode = transactionModal.match(/<div class="modal-mode"[\s\S]*?<\/div>/)?.[0] ?? '';
  assert.equal((mode.match(/class="mmBtn/g) || []).length, 2);
  assert.match(mode, /id="mmIncome"/);
  assert.match(mode, /id="mmExpense"/);
  assert.doesNotMatch(mode, /mmAudio|Áudio/);
  assert.match(transactionModal, /id="mVoiceFill"[\s\S]*Preencher por voz/);
});

test('amount opens as a custom keypad before transaction details', () => {
  assert.match(transactionModal, /id="mAmountCard"[\s\S]*id="mAmountDisplay"/);
  assert.match(transactionModal, /id="mVal" type="hidden"/);
  assert.match(transactionModal, /id="mAmountKeypad" class="tx-keypad"/);
  assert.match(transactionModal, /data-key="7"[\s\S]*data-key="÷"[\s\S]*data-key="="/);
  assert.match(transactionModal, /id="mTxDetails" class="tx-details" hidden/);
  assert.match(transactionModal, /onclick="finishAmountEntry\(\)"[\s\S]*Continuar/);
});

test('modal copy and primary action follow the selected transaction type', () => {
  assert.match(transactionModal, /id="mModalTitle"/);
  assert.match(transactionModal, /id="mAmountLabel"/);
  assert.match(transactionModal, /id="mModalClose"[\s\S]*aria-label="Fechar"/);
  assert.match(modal, /Nova entrada/);
  assert.match(modal, /Novo gasto/);
  assert.match(modal, /Adicionar entrada/);
  assert.match(modal, /Adicionar gasto/);
});

test('modal controller is exposed and styled as an app-like keypad', () => {
  assert.match(main, /window\.pressAmountKey/);
  assert.match(main, /window\.finishAmountEntry/);
  assert.match(main, /window\.openAmountKeypad/);
  assert.match(css, /\.tx-keypad-grid\s*\{[^}]*grid-template-columns:repeat\(4,1fr\)/s);
  assert.match(css, /\.tx-amount-card\s*\{[^}]*font-variant-numeric:tabular-nums/s);
  assert.match(css, /\.tx-voice-fill\s*\{/);
});
