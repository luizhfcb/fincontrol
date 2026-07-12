import { state } from '../core/state.js';
import { showToast } from './feedback.js';
import { closeFab } from './navigation.js';
import { saveTransaction } from '../services/transactions.js';
import { buildCategories } from './categories.js';
import { toLocalDateInputValue } from '../core/local-date.mjs';
import {
  createAmountState,
  formatAmountDisplay,
  formatAmountExpression,
  getAmountValue,
  pressAmountKey as reduceAmountKey,
} from '../core/amount-keypad.mjs';

let amountState = createAmountState();

function getTodayInputValue() {
  return toLocalDateInputValue();
}

function getDateInputValue(date) {
  return toLocalDateInputValue(date) || getTodayInputValue();
}

function syncAmountUI() {
  const display = document.getElementById('mAmountDisplay');
  const expression = document.getElementById('mAmountExpression');
  const value = document.getElementById('mVal');
  if (display) display.textContent = formatAmountDisplay(amountState);
  if (expression) expression.textContent = amountState.error || formatAmountExpression(amountState);
  if (value) value.value = String(getAmountValue(amountState));
}

function setAmountValue(value) {
  amountState = createAmountState(value);
  syncAmountUI();
}

function showTransactionDetails() {
  const keypad = document.getElementById('mAmountKeypad');
  const details = document.getElementById('mTxDetails');
  if (keypad) keypad.hidden = true;
  if (details) details.hidden = false;
  document.querySelector('.tx-modal-box')?.classList.add('shows-details');
}

export function pressAmountKey(key) {
  amountState = reduceAmountKey(amountState, key);
  syncAmountUI();
  if (amountState.error) showToast(amountState.error, true);
}

export function openAmountKeypad() {
  const keypad = document.getElementById('mAmountKeypad');
  const details = document.getElementById('mTxDetails');
  if (keypad) keypad.hidden = false;
  if (details) details.hidden = true;
  document.querySelector('.tx-modal-box')?.classList.remove('shows-details');
}

export function finishAmountEntry() {
  if (getAmountValue(amountState) <= 0) {
    showToast('Digite um valor maior que zero.', true);
    return;
  }
  showTransactionDetails();
}

export function openModal(type) {
  closeFab();
  state.modalType = type === 'audio' ? 'income' : type;

  const textModal = document.getElementById('modal-text');
  const audioModal = document.getElementById('modal-audio');
  const audioConfirm = document.getElementById('audio-confirm-area');
  const audioCancelRow = document.getElementById('audio-cancel-row');
  const transcript = document.getElementById('transcribed');
  const description = document.getElementById('mDesc');
  const value = document.getElementById('mVal');
  const date = document.getElementById('mDate');
  const modalBox = document.querySelector('.tx-modal-box');

  modalBox?.classList.remove('is-audio', 'shows-details');
  setAmountValue(0);
  openAmountKeypad();

  if (textModal) {
    textModal.style.display = type === 'audio' ? 'none' : 'block';
  }
  if (audioModal) {
    audioModal.style.display = type === 'audio' ? 'block' : 'none';
  }
  if (audioConfirm) {
    audioConfirm.style.display = 'none';
  }
  if (audioCancelRow) {
    audioCancelRow.style.display = 'block';
  }
  if (transcript) {
    transcript.style.display = 'none';
    transcript.textContent = '';
  }
  if (description) {
    description.value = '';
  }
  if (value) value.value = '0';
  if (date) {
    date.value = getTodayInputValue();
  }

  if (type === 'audio') {
    showAudioMode();
  } else {
    setModalType(type);
  }

  document.getElementById('modalOverlay')?.classList.add('show');
  buildCategories();
}

const AUDIO_TIP_SEEN_KEY = 'fincontrol_audio_tip_seen';

/** Alterna o modal para o modo de voz e ensina o uso na primeira vez. */
function showAudioMode() {
  const incomeButton = document.getElementById('mmIncome');
  const expenseButton = document.getElementById('mmExpense');
  if (incomeButton) incomeButton.className = 'mmBtn income';
  if (expenseButton) expenseButton.className = 'mmBtn expense';

  const textModal = document.getElementById('modal-text');
  const audioModal = document.getElementById('modal-audio');
  const title = document.getElementById('mModalTitle');
  const modalBox = document.querySelector('.tx-modal-box');
  if (textModal) textModal.style.display = 'none';
  if (audioModal) audioModal.style.display = 'block';
  if (title) title.textContent = 'Preencher por voz';
  modalBox?.classList.add('is-audio');
  if (modalBox) modalBox.dataset.txType = 'audio';

  maybeShowAudioTip();
}

function maybeShowAudioTip() {
  let seen = false;
  try {
    seen = localStorage.getItem(AUDIO_TIP_SEEN_KEY) === '1';
  } catch {
    // localStorage indisponível (aba privada): mostra a dica, sem persistir
  }
  if (seen) return;
  document.getElementById('audioTipOverlay')?.classList.add('show');
}

export function dismissAudioTip() {
  document.getElementById('audioTipOverlay')?.classList.remove('show');
  try {
    localStorage.setItem(AUDIO_TIP_SEEN_KEY, '1');
  } catch {
    // sem persistência em aba privada: dica reaparece na próxima, aceitável
  }
}

export function closeModal() {
  document.getElementById('modalOverlay')?.classList.remove('show');
  document.getElementById('audioTipOverlay')?.classList.remove('show');
  if (state.isRecording) {
    state.isRecording = false;
    document.getElementById('micBtn')?.classList.remove('rec');
  }
  state.editingTxId = null;
  document.querySelector('.tx-modal-box')?.classList.remove('is-audio', 'shows-details');
}

export function editTx(id) {
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;
  
  state.editingTxId = id;
  openModal(tx.type);
  
  // Usar setTimeout para garantir que o modal e categorias foram renderizados
  setTimeout(() => {
    const description = document.getElementById('mDesc');
    const value = document.getElementById('mVal');
    const date = document.getElementById('mDate');
    
    if (description) description.value = tx.desc;
    if (value) value.value = tx.val;
    setAmountValue(tx.val);
    if (date) date.value = getDateInputValue(tx.date);
    
    state.selectedCategory = tx.cat || 'Outros';
    buildCategories();
    showTransactionDetails();
  }, 50);
}

export function closeModalOutside(event) {
  if (event.target === document.getElementById('modalOverlay')) {
    closeModal();
  }
}

export function setModalType(type) {
  if (type === 'audio') {
    showAudioMode();
    return;
  }

  state.modalType = type;
  const incomeButton = document.getElementById('mmIncome');
  const expenseButton = document.getElementById('mmExpense');
  const textModal = document.getElementById('modal-text');
  const audioModal = document.getElementById('modal-audio');
  const modalBox = document.querySelector('.tx-modal-box');
  const title = document.getElementById('mModalTitle');
  const amountLabel = document.getElementById('mAmountLabel');
  const isEditing = Boolean(state.editingTxId);

  if (incomeButton) incomeButton.className = 'mmBtn' + (type === 'income' ? ' on income' : ' income');
  if (expenseButton) expenseButton.className = 'mmBtn' + (type === 'expense' ? ' on expense' : ' expense');
  if (textModal) textModal.style.display = 'block';
  if (audioModal) audioModal.style.display = 'none';
  modalBox?.classList.remove('is-audio');
  if (modalBox) modalBox.dataset.txType = type;

  if (title) {
    title.textContent = isEditing
      ? (type === 'income' ? 'Editar entrada' : 'Editar gasto')
      : (type === 'income' ? 'Nova entrada' : 'Novo gasto');
  }
  if (amountLabel) amountLabel.textContent = type === 'income' ? 'Valor da entrada' : 'Valor do gasto';

  const confirmButton = document.getElementById('mConfirmBtn');
  if (confirmButton) {
    confirmButton.className = 'btn-confirm ' + (type === 'income' ? 'income' : 'expense');
    confirmButton.textContent = isEditing
      ? 'Salvar alterações'
      : (type === 'income' ? 'Adicionar entrada' : 'Adicionar gasto');
  }
  syncAmountUI();
}

export async function confirmTx() {
  const description = document.getElementById('mDesc')?.value.trim();
  const value = parseFloat(document.getElementById('mVal')?.value);
  const date = document.getElementById('mDate')?.value;

  if (!description || Number.isNaN(value) || value <= 0 || !date) {
    showToast('Preencha descrição, valor e data!', true);
    return;
  }

  const result = await saveTransaction(description, value, state.modalType, state.selectedCategory, date);
  if (!result.ok) {
    showToast('Não foi possível salvar. Tente novamente.', true);
    return;
  }
  closeModal();
  showToast(state.modalType === 'expense' ? '💸 Gasto registrado!' : '💰 Entrada registrada!');
}

export async function confirmTxAudio(type) {
  const description = document.getElementById('mDescAudio')?.value.trim();
  const value = parseFloat(document.getElementById('mValAudio')?.value);

  if (!description || Number.isNaN(value) || value <= 0) {
    showToast('Confirme descrição e valor!', true);
    return;
  }

  const result = await saveTransaction(description, value, type, state.selectedCategory);
  if (!result.ok) {
    showToast('Não foi possível salvar. Tente novamente.', true);
    return;
  }
  closeModal();
  showToast(type === 'expense' ? '💸 Gasto registrado!' : '💰 Entrada registrada!');
}
