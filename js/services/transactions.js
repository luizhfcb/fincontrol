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

export async function saveTransaction(description, value, type, category, dateValue = new Date().toISOString().slice(0, 10)) {
  if (!state.currentUser) {
    return;
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
  } catch (error) {
    console.error('[Firestore] Erro ao salvar transação:', error);
    setSyncStatus('error');
    showToast('Erro ao salvar!', true);
  }
}

function buildTransactionDate(dateValue) {
  const [year, month, day] = String(dateValue).split('-').map(Number);
  const timeSource = state.editingTxId
    ? new Date(state.transactions.find((transaction) => transaction.id === state.editingTxId)?.date || Date.now())
    : new Date();

  if (!year || !month || !day || Number.isNaN(timeSource.getTime())) {
    return new Date();
  }

  return new Date(
    year,
    month - 1,
    day,
    timeSource.getHours(),
    timeSource.getMinutes(),
    timeSource.getSeconds(),
    timeSource.getMilliseconds(),
  );
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
