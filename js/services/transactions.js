import {
  addDoc,
  collection,
  db,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
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
  } catch (error) {
    setSyncStatus('error');
    showToast('Erro ao salvar!', true);
  }
}

export async function removeTransaction(id) {
  setSyncStatus('syncing');

  try {
    await deleteDoc(doc(db, 'transactions', id));
    showToast('Removido');
  } catch (error) {
    setSyncStatus('error');
    showToast('Erro ao remover', true);
  }
}
