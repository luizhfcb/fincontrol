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

  const transactionQuery = query(
    collection(db, 'transactions'),
    where('uid', '==', state.currentUser.uid),
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
    () => {
      state.transactionsLoaded = false;
      setSyncStatus('error');
      showToast('Erro de sincronização', true);
    },
  );
}

export async function saveTransaction(description, value, type, category) {
  if (!state.currentUser) {
    return;
  }

  setSyncStatus('syncing');

  try {
    if (state.editingTxId) {
      await updateDoc(doc(db, 'transactions', state.editingTxId), {
        desc: description,
        val: value,
        type,
        cat: category,
      });
      state.editingTxId = null;
    } else {
      await addDoc(collection(db, 'transactions'), {
        uid: state.currentUser.uid,
        desc: description,
        val: value,
        type,
        cat: category,
        date: new Date().toISOString(),
        month: state.currentMonth,
        year: state.currentYear,
      });
    }
  } catch (error) {
    setSyncStatus('error');
    showToast('Erro ao salvar!', true);
  }
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
    setSyncStatus('error');
    showToast('Erro ao remover', true);
  }
}
