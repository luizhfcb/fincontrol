import { DEFAULT_CATEGORIES } from '../core/constants.js';
import { transactionDateFields } from '../core/dates.js';
import { parseLocalDateInput, toLocalDateInputValue } from '../core/local-date.mjs';

const KEY = 'fincontrol_web_mock_v1';

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const USER = { uid: 'u1', name: 'Luiz H.', email: 'luiz@exemplo.com' };

function seed() {
  const rand = mulberry32(42);
  const now = new Date();
  const members = [
    { id: 'u1', name: 'Luiz H.', email: 'luiz@exemplo.com' },
    { id: 'u2', name: 'Pai', email: 'pai@exemplo.com' },
  ];
  const wallets = [
    { id: 'w-pessoal', name: 'Pessoal', shared: false, memberIds: ['u1'] },
    { id: 'w-casa', name: 'Casa', shared: true, memberIds: ['u1', 'u2'] },
  ];
  const expenseSpecs = [
    ['Mercado', 'Alimentação', 40, 220], ['Almoço', 'Alimentação', 18, 45],
    ['Uber', 'Transporte', 12, 38], ['Gasolina', 'Transporte', 80, 180],
    ['Farmácia', 'Saúde', 25, 90], ['Cinema', 'Lazer', 30, 70],
    ['Conta de luz', 'Casa', 90, 210], ['Internet', 'Casa', 99, 99],
  ];
  const transactions = [];
  let id = 1;
  for (let back = 5; back >= 0; back -= 1) {
    const base = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const lastDay = back === 0 ? now.getDate() : new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    const push = (desc, val, type, cat, day) => {
      const d = new Date(base.getFullYear(), base.getMonth(), Math.max(1, Math.min(day, lastDay)), 8 + Math.floor(rand() * 12), 30);
      const shared = cat === 'Casa' || rand() > 0.7;
      transactions.push({
        id: `t${id++}`, uid: rand() > 0.75 ? 'u2' : 'u1', walletId: shared ? 'w-casa' : 'w-pessoal',
        desc, val, type, cat, ...transactionDateFields(d),
      });
    };
    push('Salário', 3200, 'income', 'Trabalho', 5);
    if (rand() > 0.5) push('Freela', Math.round(300 + rand() * 600), 'income', 'Trabalho', 18);
    for (let i = 0; i < 12; i += 1) {
      const [desc, cat, lo, hi] = expenseSpecs[Math.floor(rand() * expenseSpecs.length)];
      push(desc, Math.round((lo + rand() * (hi - lo)) * 100) / 100, 'expense', cat, 1 + Math.floor(rand() * 28));
    }
  }
  const nextYear = new Date(now.getFullYear() + 1, 5, 1);
  return {
    transactions,
    modules: {
      categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
      limits: [
        { id: 'l1', category: 'Alimentação', limit: 600 },
        { id: 'l2', category: 'Lazer', limit: 150 },
        { id: 'l3', category: 'Transporte', limit: 300 },
      ],
      subscriptions: [
        { id: 's1', name: 'Netflix', plan: 'Padrão', value: 39.9, day: 12 },
        { id: 's2', name: 'Spotify', plan: 'Individual', value: 21.9, day: 5 },
      ],
      bills: [
        { id: 'b1', name: 'Aluguel', category: 'Despesa Fixa', value: 1100, day: 10, paid: true },
        { id: 'b2', name: 'Internet', category: 'Despesa Fixa', value: 99, day: 15, paid: false },
      ],
      stockItems: [
        { id: 'i1', name: 'Café', qty: 1, min: 2 },
        { id: 'i2', name: 'Arroz 5kg', qty: 3, min: 1 },
      ],
    },
    goals: [
      { id: 'g1', name: 'Reserva de emergência', target: 5000, saved: 1800, deadline: toLocalDateInputValue(nextYear), walletId: 'w-pessoal' },
      { id: 'g2', name: 'Viagem da família', target: 3000, saved: 2100, deadline: toLocalDateInputValue(nextYear), walletId: 'w-casa' },
    ],
    group: { name: 'Família', members, wallets },
  };
}

let db = null;
function load() {
  if (db) return db;
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch { db = null; }
  if (!db) db = seed();
  return db;
}
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* sem storage: segue em memória */ }
}
const wait = (v) => Promise.resolve(structuredClone(v));

export const mockApi = {
  async login() { sessionStorage.setItem('fc_mock_user', '1'); return wait(USER); },
  async logout() { sessionStorage.removeItem('fc_mock_user'); },
  async getSession() { return sessionStorage.getItem('fc_mock_user') ? wait(USER) : null; },

  async listTransactions() { return wait(load().transactions); },
  async saveTransaction({ id, desc, val, type, cat, date, walletId }) {
    const d = load();
    const when = parseLocalDateInput(date, new Date()) || new Date();
    const fields = { desc, val, type, cat, walletId, ...transactionDateFields(when) };
    if (id) {
      d.transactions = d.transactions.map((t) => (t.id === id ? { ...t, ...fields } : t));
    } else {
      d.transactions.push({ id: `t${Date.now()}`, uid: USER.uid, ...fields });
    }
    persist();
    return wait(d.transactions);
  },
  async deleteTransaction(id) {
    const d = load();
    d.transactions = d.transactions.filter((t) => t.id !== id);
    persist();
    return wait(d.transactions);
  },

  async getModules() { return wait(load().modules); },
  async saveModules(modules) { load().modules = modules; persist(); return wait(modules); },
  async markFeatureSeen(featureId) {
    const d = load();
    const cur = Array.isArray(d.modules.seenFeatures) ? d.modules.seenFeatures : [];
    if (!cur.includes(featureId)) {
      d.modules.seenFeatures = [...cur, featureId];
      persist();
    }
    return wait(d.modules.seenFeatures);
  },

  async listGoals() { return wait(load().goals); },
  async saveGoals(goals) { load().goals = goals; persist(); return wait(goals); },

  async getGroup() { return wait(load().group); },
  async saveGroup(group) { load().group = group; persist(); return wait(group); },

  async createInviteCode(walletId) {
    const code = `FAM-${String(Date.now()).slice(-4)}`;
    load().lastInvite = { code, walletId };
    persist();
    return wait(code);
  },
  async joinByInviteCode(rawCode) {
    const code = String(rawCode || '').trim().toUpperCase();
    if (!code || code.length < 4) throw new Error('Informe um código válido (ex.: FAM-1234).');
    return wait(load().group);
  },

  async resetDemo() { db = seed(); persist(); return wait(db); },
};
