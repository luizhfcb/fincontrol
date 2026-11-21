import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirebase,
  onAuthStateChanged,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  signInWithPopup,
  signOut,
  updateDoc,
  where,
} from '../config/firebase.js';
import { DEFAULT_CATEGORIES } from '../core/constants.js';
import { transactionDateFields } from '../core/dates.js';
import {
  PERSONAL_WALLET_ID,
  buildDefaultGroup,
  filterVisibleTransactions,
  generateInviteCode,
  mergeTransactions,
  normalizeInviteCode,
  visibleWalletsForUser,
} from '../core/family.js';
import { parseLocalDateInput } from '../core/local-date.mjs';

const DEFAULT_MODULES = () => ({
  categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
  limits: [],
  subscriptions: [],
  bills: [],
  stockItems: [],
});

const toUser = (fbUser) => (fbUser ? {
  uid: fbUser.uid,
  name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuário',
  email: fbUser.email || '',
  photoURL: fbUser.photoURL || '',
} : null);

let currentGroupCache = null;

function normalizeModules(raw = {}) {
  const base = DEFAULT_MODULES();
  return {
    categories: Array.isArray(raw.categories) && raw.categories.length ? raw.categories : base.categories,
    limits: Array.isArray(raw.limits) ? raw.limits : [],
    subscriptions: Array.isArray(raw.subscriptions) ? raw.subscriptions : [],
    bills: Array.isArray(raw.bills) ? raw.bills : [],
    stockItems: Array.isArray(raw.stockItems) ? raw.stockItems : [],
  };
}

function cutoffIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString();
}

export const firebaseApi = {
  isFirebase: true,

  onAuthChange(cb) {
    const { auth } = getFirebase();
    return onAuthStateChanged(auth, (fbUser) => cb(toUser(fbUser)));
  },

  async getSession() {
    const { auth } = getFirebase();
    return toUser(auth.currentUser);
  },

  async login() {
    const { auth, googleProvider } = getFirebase();
    const res = await signInWithPopup(auth, googleProvider);
    return toUser(res.user);
  },

  async logout() {
    const { auth } = getFirebase();
    currentGroupCache = null;
    await signOut(auth);
  },

  /**
   * Inicia listeners em tempo real para módulos/metas, grupo familiar
   * e transações (pessoais + compartilhadas do grupo ativo).
   */
  subscribe(user, { onTransactions, onModules, onGoals, onGroup, onError }) {
    const { db } = getFirebase();
    const uid = user.uid;
    const cutoff = cutoffIso();

    let personalTxs = [];
    let sharedTxs = [];
    let unsubGroup = null;
    let unsubShared = null;
    let activeGroupId = null;

    const emitTxs = () => {
      const merged = mergeTransactions(personalTxs, sharedTxs);
      const vis = visibleWalletsForUser(currentGroupCache?.wallets || [], uid);
      onTransactions(filterVisibleTransactions(merged, uid, vis));
    };

    // 1. Transações pessoais (janela deslizante de 12 meses, igual ao app original)
    const personalQ = query(
      collection(db, 'transactions'),
      where('uid', '==', uid),
      where('date', '>=', cutoff),
    );
    const unsubPersonal = onSnapshot(
      personalQ,
      (snap) => {
        personalTxs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        emitTxs();
      },
      (err) => onError?.(err),
    );

    const watchGroup = (groupId) => {
      if (groupId === activeGroupId) return;
      activeGroupId = groupId;
      unsubGroup?.();
      unsubShared?.();
      sharedTxs = [];

      const groupRef = doc(db, 'groups', groupId);
      unsubGroup = onSnapshot(
        groupRef,
        async (snap) => {
          if (!snap.exists()) {
            if (groupId === uid) {
              const initial = buildDefaultGroup(user);
              currentGroupCache = initial;
              onGroup(initial);
              try { await setDoc(groupRef, initial, { merge: true }); } catch { /* offline */ }
            }
            return;
          }
          const grp = { id: snap.id, ...snap.data() };
          currentGroupCache = grp;
          onGroup(grp);
          emitTxs();
        },
        (err) => onError?.(err),
      );

      // 2. Transações compartilhadas do grupo (sem índice composto: filtra janela de 12 meses em memória)
      const sharedQ = query(
        collection(db, 'transactions'),
        where('groupId', '==', groupId),
      );
      unsubShared = onSnapshot(
        sharedQ,
        (snap) => {
          sharedTxs = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((t) => !t.date || t.date >= cutoff);
          emitTxs();
        },
        (err) => onError?.(err),
      );
    };

    // 3. Módulos + Metas + activeGroupId em modules/{uid}
    const modRef = doc(db, 'modules', uid);
    const unsubModules = onSnapshot(
      modRef,
      (snap) => {
        const raw = snap.exists() ? snap.data() : {};
        onModules(normalizeModules(raw));
        onGoals(Array.isArray(raw.goals) ? raw.goals : []);
        watchGroup(raw.activeGroupId || uid);
      },
      (err) => onError?.(err),
    );

    return () => {
      unsubPersonal?.();
      unsubModules?.();
      unsubGroup?.();
      unsubShared?.();
    };
  },

  async saveTransaction({ id, desc, val, type, cat, date, walletId }) {
    const { auth, db } = getFirebase();
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Usuário não autenticado.');

    const when = parseLocalDateInput(date, new Date()) || new Date();
    const targetWallet = currentGroupCache?.wallets?.find((w) => w.id === walletId);
    const groupId = targetWallet?.shared ? (currentGroupCache?.id || uid) : null;

    const payload = {
      desc,
      val,
      type,
      cat,
      walletId: walletId || PERSONAL_WALLET_ID,
      groupId,
      ...transactionDateFields(when),
    };

    if (id) {
      await updateDoc(doc(db, 'transactions', id), payload);
    } else {
      await addDoc(collection(db, 'transactions'), { uid, ...payload });
    }
    return null; // onSnapshot atualiza o estado em tempo real
  },

  async deleteTransaction(id) {
    const { db } = getFirebase();
    await deleteDoc(doc(db, 'transactions', id));
    return null;
  },

  async saveModules(modules) {
    const { auth, db } = getFirebase();
    const uid = auth.currentUser?.uid;
    if (!uid) return modules;
    await setDoc(doc(db, 'modules', uid), {
      categories: modules.categories,
      limits: modules.limits,
      subscriptions: modules.subscriptions,
      bills: modules.bills,
      stockItems: modules.stockItems,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return modules;
  },

  async saveGoals(goals) {
    const { auth, db } = getFirebase();
    const uid = auth.currentUser?.uid;
    if (!uid) return goals;
    await setDoc(doc(db, 'modules', uid), { goals, updatedAt: serverTimestamp() }, { merge: true });
    return goals;
  },

  async saveGroup(group) {
    const { auth, db } = getFirebase();
    const uid = auth.currentUser?.uid;
    if (!uid) return group;
    const gid = group.id || uid;
    const next = {
      ...group,
      id: gid,
      ownerUid: group.ownerUid || uid,
      memberUids: [...new Set(group.members.map((m) => m.id))],
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'groups', gid), next, { merge: true });
    currentGroupCache = group;
    return group;
  },

  async createInviteCode(walletId) {
    const { auth, db } = getFirebase();
    const uid = auth.currentUser?.uid;
    if (!uid || !currentGroupCache) throw new Error('Grupo não carregado.');
    if (!walletId || walletId === PERSONAL_WALLET_ID) {
      throw new Error('Crie uma carteira separada (ex.: Viagem ou Casa) para compartilhar.');
    }

    const gid = currentGroupCache.id || uid;
    // Garante que a carteira já fique marcada como compartilhada para que novos lançamentos levem groupId
    const wallets = currentGroupCache.wallets || [];
    const target = wallets.find((w) => w.id === walletId);
    if (target && !target.shared) {
      const nextWallets = wallets.map((w) => (w.id === walletId ? { ...w, shared: true } : w));
      await setDoc(doc(db, 'groups', gid), { wallets: nextWallets, updatedAt: serverTimestamp() }, { merge: true });
      currentGroupCache = { ...currentGroupCache, wallets: nextWallets };
    }

    const code = generateInviteCode();
    await setDoc(doc(db, 'invites', code), {
      groupId: gid,
      walletId,
      createdBy: uid,
      createdAt: serverTimestamp(),
    });
    return code;
  },

  async joinByInviteCode(rawCode) {
    const { auth, db } = getFirebase();
    const fbUser = auth.currentUser;
    if (!fbUser) throw new Error('Faça login para aceitar um convite.');

    const code = normalizeInviteCode(rawCode);
    if (!code) throw new Error('Informe um código de convite válido.');

    const invRef = doc(db, 'invites', code);
    const invSnap = await getDoc(invRef);
    if (!invSnap.exists()) throw new Error('Código de convite não encontrado ou expirado.');

    const { groupId, walletId } = invSnap.data();
    const groupRef = doc(db, 'groups', groupId);

    // 1º passo: entra em memberUids antes de ler o documento do grupo
    // (as regras do Firestore exigem uid em memberUids para permitir leitura de groups/{groupId})
    await updateDoc(groupRef, {
      memberUids: arrayUnion(fbUser.uid),
    });

    // 2º passo: agora como membro autenticado, lê e adiciona o perfil + acesso à carteira convidada
    const groupSnap = await getDoc(groupRef);
    if (!groupSnap.exists()) throw new Error('Grupo não encontrado.');

    const grp = { id: groupSnap.id, ...groupSnap.data() };
    const memberProfile = {
      id: fbUser.uid,
      name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Membro',
      email: fbUser.email || '',
      photoURL: fbUser.photoURL || '',
    };

    const alreadyMember = grp.members?.some((m) => m.id === fbUser.uid);
    const nextMembers = alreadyMember ? grp.members : [...(grp.members || []), memberProfile];
    const nextWallets = (grp.wallets || []).map((w) => (
      w.id === walletId
        ? { ...w, shared: true, memberIds: [...new Set([...(w.memberIds || []), fbUser.uid])] }
        : w
    ));

    await updateDoc(groupRef, {
      members: nextMembers,
      wallets: nextWallets,
    });
    await setDoc(doc(db, 'modules', fbUser.uid), { activeGroupId: groupId }, { merge: true });
    return { ...grp, members: nextMembers, wallets: nextWallets };
  },
};
