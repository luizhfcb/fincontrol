import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PERSONAL_WALLET_ID,
  buildDefaultGroup,
  deleteWallet,
  filterVisibleTransactions,
  generateInviteCode,
  mergeTransactions,
  normalizeInviteCode,
  normalizeTransaction,
  renameWallet,
  visibleWalletsForUser,
} from '../src/core/family.js';

test('normalizeTransaction mantém retrocompatibilidade definindo carteira Pessoal', () => {
  const legacy = { id: '1', uid: 'u1', type: 'expense', val: 40, desc: 'Almoço' };
  assert.equal(normalizeTransaction(legacy).walletId, PERSONAL_WALLET_ID);
  assert.equal(normalizeTransaction({ ...legacy, walletId: 'w-casa' }).walletId, 'w-casa');
});

test('mergeTransactions remove duplicatas entre feed pessoal e compartilhado e ordena por data', () => {
  const a = { id: 't1', type: 'expense', val: 50, date: '2026-11-10T10:00:00.000Z' };
  const b = { id: 't2', type: 'income', val: 300, date: '2026-11-12T10:00:00.000Z', walletId: 'w-casa' };
  const merged = mergeTransactions([a], [a, b, { id: 'bad', type: 'other' }]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, 't2');
  assert.equal(merged[1].walletId, PERSONAL_WALLET_ID);
});

test('buildDefaultGroup cria grupo individual com carteira Pessoal', () => {
  const g = buildDefaultGroup({ uid: 'abc', name: 'Luiz', email: 'luiz@exemplo.com' });
  assert.equal(g.ownerUid, 'abc');
  assert.deepEqual(g.memberUids, ['abc']);
  assert.equal(g.wallets[0].id, PERSONAL_WALLET_ID);
});

test('códigos de convite são normalizados e gerados no formato FAM-XXXX', () => {
  assert.equal(normalizeInviteCode(' fam-7k3m '), 'FAM-7K3M');
  const code = generateInviteCode(() => 0);
  assert.match(code, /^FAM-[A-Z0-9]{4}$/);
});

test('visibleWalletsForUser e filterVisibleTransactions isolam carteiras não compartilhadas com o membro', () => {
  const wallets = [
    { id: PERSONAL_WALLET_ID, name: 'Pessoal', shared: false, memberIds: ['pai'] },
    { id: 'w-empresa', name: 'Empresa do Pai', shared: false, memberIds: ['pai'] },
    { id: 'w-viagem', name: 'Viagem', shared: true, memberIds: ['pai', 'filho'] },
  ];
  const filhoWallets = visibleWalletsForUser(wallets, 'filho');
  assert.deepEqual(filhoWallets.map((w) => w.id), [PERSONAL_WALLET_ID, 'w-viagem']);

  const txs = [
    { id: '1', uid: 'pai', walletId: PERSONAL_WALLET_ID, type: 'expense', val: 10 },
    { id: '2', uid: 'pai', walletId: 'w-empresa', type: 'expense', val: 500 },
    { id: '3', uid: 'pai', walletId: 'w-viagem', type: 'expense', val: 120 },
    { id: '4', uid: 'filho', walletId: PERSONAL_WALLET_ID, type: 'expense', val: 25 },
  ];
  const filhoTxs = filterVisibleTransactions(txs, 'filho', filhoWallets);
  assert.deepEqual(filhoTxs.map((t) => t.id), ['3', '4']);
});

test('renameWallet e deleteWallet validam nomes e protegem a carteira Pessoal', () => {
  const base = {
    id: 'u1',
    wallets: [
      { id: PERSONAL_WALLET_ID, name: 'Pessoal', shared: false, memberIds: ['u1'] },
      { id: 'w-viagem', name: 'Viagem', shared: true, memberIds: ['u1', 'u2'] },
    ],
  };

  assert.equal(renameWallet(base, 'w-viagem', '   ').ok, false);
  assert.equal(renameWallet(base, 'w-viagem', 'pessoal').ok, false);
  const renamed = renameWallet(base, 'w-viagem', 'Viagem Sul');
  assert.equal(renamed.ok, true);
  assert.equal(renamed.group.wallets[1].name, 'Viagem Sul');

  assert.equal(deleteWallet(base, PERSONAL_WALLET_ID).ok, false);
  const deleted = deleteWallet(base, 'w-viagem');
  assert.equal(deleted.ok, true);
  assert.deepEqual(deleted.group.wallets.map((w) => w.id), [PERSONAL_WALLET_ID]);
});
