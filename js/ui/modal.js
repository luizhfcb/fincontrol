import { state } from '../core/state.js';
import { showToast } from './feedback.js';
import { closeFab } from './navigation.js';
import { saveTransaction } from '../services/transactions.js';
import { buildCategories } from './categories.js';

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function getDateInputValue(date) {
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return getTodayInputValue();
  return parsedDate.toISOString().slice(0, 10);
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
  const audioButton = document.getElementById('mmAudio');
  if (incomeButton) incomeButton.className = 'mmBtn income';
  if (expenseButton) expenseButton.className = 'mmBtn expense';
  if (audioButton) audioButton.className = 'mmBtn on audio';

  const textModal = document.getElementById('modal-text');
  const audioModal = document.getElementById('modal-audio');
  if (textModal) textModal.style.display = 'none';
  if (audioModal) audioModal.style.display = 'block';

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
    if (date) date.value = getDateInputValue(tx.date);
    
    state.selectedCategory = tx.cat || 'Outros';
    buildCategories();
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
  const date = document.getElementById('mDate')?.value;

  if (!description || Number.isNaN(value) || value <= 0 || !date) {
    showToast('Preencha descrição, valor e data!', true);
    return;
  }

  await saveTransaction(description, value, state.modalType, state.selectedCategory, date);
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
