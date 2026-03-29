export function showToast(message, isError = false) {
  const element = document.getElementById('toast');
  if (!element) {
    return;
  }

  element.textContent = message;
  element.className = 'toast' + (isError ? ' err' : '');

  requestAnimationFrame(() => element.classList.add('show'));
  window.setTimeout(() => element.classList.remove('show'), 2400);
}

export function setSyncStatus(status) {
  ['mSyncDot', 'dSyncDot'].forEach((id) => {
    const dot = document.getElementById(id);
    if (dot) {
      dot.className = 'sync-dot' + (status === 'syncing' ? ' syncing' : status === 'error' ? ' error' : '');
    }
  });

  const label = document.getElementById('dSyncLabel');
  if (label) {
    label.textContent = status === 'syncing' ? 'Sincronizando…' : status === 'error' ? 'Erro' : 'Sincronizado';
  }
}
