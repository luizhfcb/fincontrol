import {
  addDoc,
  collection,
  db,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  updateDoc,
} from '../config/firebase.js';
import { state } from '../core/state.js';
import { transactionDateFields } from '../core/dates.js';
import { toLocalDateInputValue, parseLocalDateInput } from '../core/local-date.mjs';
import { showToast, setSyncStatus } from '../ui/feedback.js';
import { refreshUI } from '../ui/render.js';

export function startListening() {
  if (!state.currentUser) {
    state.transactionsLoaded = false;
    return;
  }

  if (state.unsubscribe) {
    state.unsubscribe();
  }

  setSyncStatus('syncing');
  state.transactionsLoaded = false;

  // Janela deslizante: só últimos 12 meses. Não puxa histórico inteiro.
  // Cobre mês atual + 11 anteriores (navegação de meses e gráfico 6 meses).
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const transactionQuery = query(
    collection(db, 'transactions'),
    where('uid', '==', state.currentUser.uid),
    where('date', '>=', cutoff.toISOString()),
  );

  state.unsubscribe = onSnapshot(
    transactionQuery,
    (snapshot) => {
      state.transactions = snapshot.docs
        .map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() }))
        .filter((item) => item.type === 'income' || item.type === 'expense');
      state.transactionsLoaded = true;
      setSyncStatus('ok');
      refreshUI();
    },
    (error) => {
      console.error('[Firestore] Erro na sincronização de transações:', error);
      state.transactionsLoaded = false;
      setSyncStatus('error');
      showToast('Erro de sincronização', true);
    },
  );
}

/**
 * Salva/edita uma transação. Retorna sempre um resultado explícito para que
 * quem chama nunca mostre "sucesso" após uma escrita rejeitada:
 *   { ok: true }
 *   { ok: false, code: 'unauthenticated' | 'write-failed', error? }
 */
export async function saveTransaction(description, value, type, category, dateValue = toLocalDateInputValue()) {
  if (!state.currentUser) {
    return { ok: false, code: 'unauthenticated' };
  }

  setSyncStatus('syncing');
  const transactionDate = buildTransactionDate(dateValue);
  const dateFields = transactionDateFields(transactionDate);

  try {
    if (state.editingTxId) {
      await updateDoc(doc(db, 'transactions', state.editingTxId), {
        desc: description,
        val: value,
        type,
        cat: category,
        ...dateFields,
      });
      state.editingTxId = null;
    } else {
      await addDoc(collection(db, 'transactions'), {
        uid: state.currentUser.uid,
        desc: description,
        val: value,
        type,
        cat: category,
        ...dateFields,
      });
    }
    setSyncStatus('ok');
    return { ok: true };
  } catch (error) {
    console.error('[Firestore] Erro ao salvar transação:', error);
    setSyncStatus('error');
    return { ok: false, code: 'write-failed', error };
  }
}

function buildTransactionDate(dateValue) {
  // Ao editar, herda a hora original da transação; ao criar, usa a hora atual.
  const timeSource = state.editingTxId
    ? new Date(state.transactions.find((transaction) => transaction.id === state.editingTxId)?.date || Date.now())
    : new Date();

  // parseLocalDateInput monta a data no fuso local (sem drift UTC) e valida.
  // Data ausente/inválida cai na hora atual — comportamento leniente de antes.
  return parseLocalDateInput(dateValue, timeSource) || new Date();
}

export function removeTransaction(id) {
  const modal = document.getElementById('genericFormModal');
  const titleEl = document.getElementById('gfmTitle');
  const body = document.getElementById('gfmBody');
  const confirm = document.getElementById('gfmConfirm');

  if (!modal || !titleEl || !body || !confirm) {
    showToast('Erro ao abrir confirmação', true);
    return;
  }

  titleEl.textContent = 'Excluir transação';
  body.innerHTML = '<p class="gfm-message">Deseja excluir esta transação? Esta ação não pode ser desfeita.</p>';
  confirm.textContent = 'Excluir';
  confirm.onclick = async () => {
    modal.style.display = 'none';
    await deleteTransaction(id);
  };

  modal.style.display = 'flex';
}

async function deleteTransaction(id) {
  setSyncStatus('syncing');

  try {
    await deleteDoc(doc(db, 'transactions', id));
    showToast('Removido');
  } catch (error) {
    console.error('[Firestore] Erro ao remover transação:', error);
    setSyncStatus('error');
    showToast('Erro ao remover', true);
  }
}
