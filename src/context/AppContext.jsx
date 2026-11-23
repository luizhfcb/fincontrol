import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import ToastViewport from '../components/Toast.jsx';
import { visibleWalletsForUser } from '../core/family.js';
import { formatCompactCurrency, formatCurrency } from '../core/format.js';
import { USE_FIREBASE, api } from '../services/index.js';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);
const EMPTY_GROUP = { name: '', members: [], wallets: [] };

function readPref(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }) {
  const now = new Date();
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [allTransactions, setAllTransactions] = useState([]);
  const [modules, setModules] = useState(null);
  const [goals, setGoals] = useState([]);
  const [group, setGroup] = useState(null);
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [walletId, setWalletId] = useState('all');
  const [txModal, setTxModal] = useState(null); // null | { tx?, defaultType? }
  const [theme, setTheme] = useState(() => readPref('fc_theme', 'dark'));
  const [hideValues, setHideValues] = useState(() => readPref('fc_hide_values', '0') === '1');
  const [toasts, setToasts] = useState([]);
  const toastTimersRef = useRef(new Map());

  const dismissToast = useCallback((id) => {
    const timer = toastTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message, tone = 'success') => {
    if (!message) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => {
      const next = [...prev, { id, message, tone }];
      if (next.length > 3) {
        const dropped = next.shift();
        if (dropped) {
          const t = toastTimersRef.current.get(dropped.id);
          if (t) {
            clearTimeout(t);
            toastTimersRef.current.delete(dropped.id);
          }
        }
      }
      return next;
    });
    const delay = tone === 'error' ? 5000 : 3500;
    const timer = setTimeout(() => {
      toastTimersRef.current.delete(id);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, delay);
    toastTimersRef.current.set(id, timer);
  }, []);

  useEffect(() => () => {
    for (const timer of toastTimersRef.current.values()) {
      clearTimeout(timer);
    }
    toastTimersRef.current.clear();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#060913' : '#F1F5F9');
    try { localStorage.setItem('fc_theme', theme); } catch { /* ignore */ }
  }, [theme]);

  useEffect(() => {
    try { localStorage.setItem('fc_hide_values', hideValues ? '1' : '0'); } catch { /* ignore */ }
  }, [hideValues]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  const toggleHideValues = useCallback(() => setHideValues((h) => !h), []);

  const fmt = useCallback((v) => (hideValues ? 'R$ ••••' : formatCurrency(v)), [hideValues]);
  const fmtCompact = useCallback((v) => (hideValues ? 'R$ ••' : formatCompactCurrency(v)), [hideValues]);

  const loadAll = useCallback(async () => {
    if (api.subscribe) return;
    const [txs, mods, gs, grp] = await Promise.all([
      api.listTransactions(), api.getModules(), api.listGoals(), api.getGroup(),
    ]);
    setAllTransactions(txs); setModules(mods); setGoals(gs); setGroup(grp);
  }, []);

  // Boot & Auth
  useEffect(() => {
    if (api.onAuthChange) {
      let unsubData = null;
      const unsubAuth = api.onAuthChange((nextUser) => {
        unsubData?.();
        unsubData = null;
        setUser(nextUser);
        if (nextUser) {
          unsubData = api.subscribe(nextUser, {
            onTransactions: setAllTransactions,
            onModules: setModules,
            onGoals: setGoals,
            onGroup: setGroup,
            onError: (err) => console.error('[Firebase]', err),
          });
        } else {
          setAllTransactions([]);
          setModules(null);
          setGoals([]);
          setGroup(null);
        }
        setBooting(false);
      });
      return () => {
        unsubData?.();
        unsubAuth?.();
      };
    }

    (async () => {
      const session = await api.getSession();
      if (session) { setUser(session); await loadAll(); }
      setBooting(false);
    })();
    return undefined;
  }, [loadAll]);

  const login = async () => {
    const logged = await api.login();
    if (!api.onAuthChange) {
      setUser(logged);
      await loadAll();
    }
  };
  const logout = async () => {
    await api.logout();
    if (!api.onAuthChange) setUser(null);
  };

  const shiftMonth = (delta) => {
    const d = new Date(year, month + delta, 1);
    setMonth(d.getMonth()); setYear(d.getFullYear());
  };

  const goToCurrentMonth = () => {
    const today = new Date();
    setMonth(today.getMonth());
    setYear(today.getFullYear());
  };

  const safeGroup = useMemo(() => {
    if (!group) return EMPTY_GROUP;
    return {
      ...group,
      name: group.name || '',
      members: Array.isArray(group.members) ? group.members : [],
      wallets: Array.isArray(group.wallets) ? group.wallets : [],
    };
  }, [group]);

  const visibleWallets = useMemo(
    () => visibleWalletsForUser(safeGroup.wallets, user?.uid),
    [safeGroup, user],
  );

  const transactions = useMemo(
    () => (walletId === 'all' ? allTransactions : allTransactions.filter((t) => t.walletId === walletId)),
    [allTransactions, walletId],
  );
  const monthlyTransactions = useMemo(
    () => transactions.filter((t) => t.month === month && t.year === year),
    [transactions, month, year],
  );

  const saveTransaction = async (tx) => {
    const next = await api.saveTransaction(tx);
    if (Array.isArray(next)) setAllTransactions(next);
  };
  const deleteTransaction = async (id) => {
    const next = await api.deleteTransaction(id);
    if (Array.isArray(next)) setAllTransactions(next);
  };
  const updateModules = async (next) => {
    const saved = await api.saveModules(next);
    if (saved) setModules(saved);
  };
  const updateGoals = async (next) => {
    const saved = await api.saveGoals(next);
    if (saved) setGoals(saved);
  };
  const updateGroup = async (next) => {
    const saved = await api.saveGroup(next);
    if (saved) setGroup(saved);
  };
  const markFeatureSeen = useCallback(async (featureId) => {
    if (!featureId) return;
    setModules((prev) => {
      if (!prev) return prev;
      const cur = Array.isArray(prev.seenFeatures) ? prev.seenFeatures : [];
      if (cur.includes(featureId)) return prev;
      return { ...prev, seenFeatures: [...cur, featureId] };
    });
    try {
      await api.markFeatureSeen?.(featureId);
    } catch { /* fallback localStorage já salvo */ }
  }, []);
  const createInviteCode = async (targetWalletId) => api.createInviteCode(targetWalletId);
  const joinByInviteCode = async (code) => {
    const joined = await api.joinByInviteCode(code);
    if (joined && !api.subscribe) setGroup(joined);
    return joined;
  };
  const resetDemo = async () => {
    if (api.resetDemo) await api.resetDemo();
    await loadAll();
  };

  const value = {
    isFirebase: USE_FIREBASE,
    user, booting, login, logout,
    transactions, allTransactions, monthlyTransactions,
    modules, goals, group: safeGroup, visibleWallets,
    month, year, shiftMonth, goToCurrentMonth,
    walletId, setWalletId,
    txModal,
    openTxModal: (tx = null, opts = {}) => setTxModal({ tx, defaultType: opts?.defaultType || 'expense' }),
    closeTxModal: () => setTxModal(null),
    saveTransaction, deleteTransaction, updateModules, updateGoals, updateGroup,
    createInviteCode, joinByInviteCode, markFeatureSeen, resetDemo,
    theme, toggleTheme, hideValues, toggleHideValues, fmt, fmtCompact,
    toasts, toast, dismissToast,
  };
  return (
    <AppContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </AppContext.Provider>
  );
}
