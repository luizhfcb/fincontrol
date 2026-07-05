# Confirm Transaction Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a confirmation modal before deleting a transaction.

**Architecture:** Reuse the existing `genericFormModal` DOM and visual style. Move the confirmation behavior into `js/services/transactions.js` so callers can keep using `removeTransaction(id)` without changing the transaction card rendering.

**Tech Stack:** Vanilla JavaScript modules, Firebase Firestore, existing HTML/CSS modal in `index.html` and `css/main.css`.

---

## File Structure

- Modify `js/services/transactions.js`: make `removeTransaction(id)` open a confirmation modal and delete only after confirmation.
- No new runtime files are required.
- No automated test files exist in this project; verification is manual plus module syntax import check.

### Task 1: Confirm Transaction Delete

**Files:**
- Modify: `js/services/transactions.js:86-96`

- [ ] **Step 1: Inspect current transaction deletion path**

Confirm `window.delTx = removeTransaction` in `js/main.js` and delete buttons call `delTx('${transaction.id}')` from `js/ui/render.js`.

Expected: delete action routes through `removeTransaction(id)`.

- [ ] **Step 2: Add confirmation wrapper**

Replace `removeTransaction(id)` in `js/services/transactions.js` with:

```js
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
```

Expected: clicking the delete button opens the modal; deletion happens only inside `confirm.onclick`. If the modal is unavailable, the app shows an error and does not delete the transaction.

- [ ] **Step 3: Check JavaScript module syntax**

Run: `node --check js/services/transactions.js`

Expected: no syntax errors.

- [ ] **Step 4: Manual browser verification**

Open the app in a browser, sign in if needed, and verify:

- Clicking a transaction delete icon opens `Excluir transação`.
- Clicking `Cancelar` closes the modal and leaves the transaction unchanged.
- Clicking outside the modal closes it and leaves the transaction unchanged.
- Clicking `Excluir` removes the transaction and shows `Removido`.
- If Firebase deletion fails, the existing `Erro ao remover` toast appears.

- [ ] **Step 5: Commit if repository is available**

This workspace is not currently a Git repository. If it becomes one, commit with:

```bash
git add js/services/transactions.js docs/superpowers/specs/2026-07-04-confirm-transaction-delete-design.md docs/superpowers/plans/2026-07-04-confirm-transaction-delete.md
git commit -m "feat: confirm transaction deletion"
```

## Self-Review

- Spec coverage: all requested behavior is covered by Task 1.
- Placeholder scan: no TBD/TODO placeholders remain.
- Type consistency: existing `removeTransaction(id)` export remains the public entry point.
