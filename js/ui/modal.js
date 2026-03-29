import { state } from '../core/state.js';
import { showToast } from './feedback.js';
import { closeFab } from './navigation.js';
import { saveTransaction } from '../services/transactions.js';
import { buildCategories } from './categories.js';

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
  if (value) {
    value.value = '';
  }

  if (type === 'audio') {
    const incomeButton = document.getElementById('mmIncome');
    const expenseButton = document.getElementById('mmExpense');
    const audioButton = document.getElementById('mmAudio');
    if (incomeButton) incomeButton.className = 'mmBtn income';
    if (expenseButton) expenseButton.className = 'mmBtn expense';
    if (audioButton) audioButton.className = 'mmBtn on audio';
  } else {
    setModalType(type);
  }

  document.getElementById('modalOverlay')?.classList.add('show');
  buildCategories();
}

export function closeModal() {
  document.getElementById('modalOverlay')?.classList.remove('show');
  if (state.isRecording) {
    state.isRecording = false;
    document.getElementById('micBtn')?.classList.remove('rec');
  }
}

export function closeModalOutside(event) {
  if (event.target === document.getElementById('modalOverlay')) {
    closeModal();
  }
}

export function setModalType(type) {
  if (type === 'audio') {
    return;
  }

  state.modalType = type;
  document.getElementById('mmIncome').className = 'mmBtn' + (type === 'income' ? ' on income' : ' income');
  document.getElementById('mmExpense').className = 'mmBtn' + (type === 'expense' ? ' on expense' : ' expense');
  document.getElementById('mmAudio').className = 'mmBtn audio';
  document.getElementById('modal-text').style.display = 'block';
  document.getElementById('modal-audio').style.display = 'none';

  const confirmButton = document.getElementById('mConfirmBtn');
  confirmButton.className = 'btn-confirm ' + (type === 'income' ? 'income' : 'expense');
  confirmButton.textContent = type === 'income' ? '+ Confirmar Entrada' : '− Confirmar Gasto';
}

export async function confirmTx() {
  const description = document.getElementById('mDesc')?.value.trim();
  const value = parseFloat(document.getElementById('mVal')?.value);

  if (!description || Number.isNaN(value) || value <= 0) {
    showToast('Preencha descrição e valor!', true);
    return;
  }

  await saveTransaction(description, value, state.modalType, state.selectedCategory);
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

  await saveTransaction(description, value, type, state.selectedCategory);
  closeModal();
  showToast(type === 'expense' ? '💸 Gasto registrado!' : '💰 Entrada registrada!');
}
