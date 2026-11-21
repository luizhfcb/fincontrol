// Regras puras do Modo Família (normalização retrocompatível de carteiras,
// mesclagem de transações pessoais + compartilhadas e códigos de convite).

export const PERSONAL_WALLET_ID = 'w-pessoal';

/**
 * Normaliza transações antigas do Firestore (que não tinham `walletId`)
 * para a carteira "Pessoal", garantindo retrocompatibilidade total.
 */
export function normalizeTransaction(tx) {
  return {
    ...tx,
    walletId: tx.walletId || PERSONAL_WALLET_ID,
  };
}

/**
 * Mescla transações pessoais e compartilhadas sem duplicatas (por `id`)
 * e ordena da mais recente para a mais antiga.
 */
export function mergeTransactions(personal = [], shared = []) {
  const byId = new Map();
  for (const tx of personal) {
    if (tx?.id && (tx.type === 'income' || tx.type === 'expense')) {
      byId.set(tx.id, normalizeTransaction(tx));
    }
  }
  for (const tx of shared) {
    if (tx?.id && (tx.type === 'income' || tx.type === 'expense')) {
      byId.set(tx.id, normalizeTransaction(tx));
    }
  }
  return [...byId.values()].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}

/**
 * Cria o grupo padrão para um usuário que ainda não participa de nenhum grupo.
 */
export function buildDefaultGroup(user) {
  const uid = user?.uid || 'u1';
  const name = user?.name || user?.displayName || 'Você';
  const email = user?.email || '';
  return {
    id: uid,
    name: 'Minhas Carteiras',
    ownerUid: uid,
    memberUids: [uid],
    members: [{ id: uid, name, email, photoURL: user?.photoURL || '' }],
    wallets: [
      { id: PERSONAL_WALLET_ID, name: 'Pessoal', shared: false, memberIds: [uid] },
    ],
  };
}

/**
 * Normaliza o código de convite digitado pelo usuário (maiúsculas, sem espaços).
 */
export function normalizeInviteCode(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '');
}

/**
 * Retorna apenas as carteiras que o usuário pode enxergar:
 * sua própria carteira Pessoal + carteiras em que o uid está em `memberIds`.
 */
export function visibleWalletsForUser(wallets = [], uid) {
  if (!uid) return wallets;
  return wallets.filter(
    (w) => w.id === PERSONAL_WALLET_ID || (Array.isArray(w.memberIds) && w.memberIds.includes(uid)),
  );
}

/**
 * Garante que um membro só veja transações pessoais dele (uid === meu uid)
 * ou transações de carteiras compartilhadas em que ele participa.
 */
export function filterVisibleTransactions(transactions = [], uid, visibleWallets = []) {
  if (!uid) return transactions;
  const sharedIds = new Set(
    visibleWallets.filter((w) => w.id !== PERSONAL_WALLET_ID).map((w) => w.id),
  );
  return transactions.filter((tx) => {
    const wid = tx.walletId || PERSONAL_WALLET_ID;
    if (wid === PERSONAL_WALLET_ID) return tx.uid === uid;
    return tx.uid === uid || sharedIds.has(wid);
  });
}

/**
 * Gera um código curto legível para compartilhamento (ex.: FAM-7K3M).
 */
export function generateInviteCode(rand = Math.random) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i += 1) {
    suffix += alphabet[Math.floor(rand() * alphabet.length)];
  }
  return `FAM-${suffix}`;
}

/**
 * Renomeia uma carteira do grupo com validação de nome vazio ou duplicado.
 */
export function renameWallet(group, walletId, rawName) {
  const name = String(rawName || '').trim();
  if (!name) return { ok: false, error: 'Informe um nome para a carteira.' };
  if (name.length > 40) return { ok: false, error: 'Use no máximo 40 caracteres.' };

  const wallets = group?.wallets || [];
  const exists = wallets.some(
    (w) => w.id !== walletId && w.name.trim().toLowerCase() === name.toLowerCase(),
  );
  if (exists) return { ok: false, error: 'Já existe uma carteira com esse nome.' };

  const found = wallets.some((w) => w.id === walletId);
  if (!found) return { ok: false, error: 'Carteira não encontrada.' };

  return {
    ok: true,
    group: {
      ...group,
      wallets: wallets.map((w) => (w.id === walletId ? { ...w, name } : w)),
    },
  };
}

/**
 * Exclui uma carteira criada pelo usuário (protege a carteira Pessoal).
 */
export function deleteWallet(group, walletId) {
  if (walletId === PERSONAL_WALLET_ID) {
    return { ok: false, error: 'A carteira Pessoal não pode ser excluída.' };
  }
  const wallets = group?.wallets || [];
  if (!wallets.some((w) => w.id === walletId)) {
    return { ok: false, error: 'Carteira não encontrada.' };
  }
  return {
    ok: true,
    group: {
      ...group,
      wallets: wallets.filter((w) => w.id !== walletId),
    },
  };
}
