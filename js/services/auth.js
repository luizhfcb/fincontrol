import {
  auth,
  googleProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from '../config/firebase.js';
import { MONTHS } from '../core/constants.js';
import { state } from '../core/state.js';
import { setText } from '../core/utils.js';
import { showToast } from '../ui/feedback.js';
import { updateResponsiveAppView } from '../ui/layout.js';
import { buildCategories } from '../ui/categories.js';
import { startListening } from './transactions.js';

export async function loginGoogle() {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error('Firebase login error:', error);
    showToast(error?.code ? `Erro: ${error.code}` : 'Erro ao entrar.', true);
  }
}

export async function doLogout() {
  if (!window.confirm('Sair da conta?')) {
    return;
  }

  if (state.unsubscribe) {
    state.unsubscribe();
    state.unsubscribe = null;
  }

  await signOut(auth);
}

export function initAuth() {
  onAuthStateChanged(auth, (user) => {
    const loading = document.getElementById('app-loading');
    if (loading) {
      loading.style.display = 'none';
    }

    if (user) {
      state.currentUser = user;

      const initials = (user.displayName || 'U')
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      const avatar = document.getElementById('mAvatar');
      const userName = document.getElementById('dUserName');
      if (avatar) {
        avatar.textContent = initials;
      }
      if (userName) {
        userName.textContent = user.displayName || user.email || 'Usuário';
      }

      const monthLabel = `${MONTHS[state.currentMonth]} ${state.currentYear}`;
      setText('monthLabel', monthLabel);
      setText('dMonthLabel', monthLabel);

      updateResponsiveAppView();
      buildCategories();
      startListening();
      return;
    }

    state.currentUser = null;
    state.transactions = [];

    if (state.unsubscribe) {
      state.unsubscribe();
      state.unsubscribe = null;
    }

    updateResponsiveAppView();
  });
}
