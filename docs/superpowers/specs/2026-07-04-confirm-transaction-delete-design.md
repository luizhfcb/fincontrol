# Confirm Transaction Delete Design

## Context

Transaction deletion currently happens immediately from the transaction card delete action. This can cause accidental data loss.

The app already has a reusable `genericFormModal` confirmation pattern used by module removal actions such as subscriptions, stock items, limits, categories, and bills.

## Decision

Use the existing `genericFormModal` confirmation UI for transaction deletion.

## Behavior

- Clicking the delete button on a transaction opens a confirmation modal instead of deleting immediately.
- The modal title is `Excluir transação`.
- The modal message is `Deseja excluir esta transação? Esta ação não pode ser desfeita.`
- The modal keeps the existing `Cancelar` button.
- The confirmation button is labeled `Excluir`.
- The transaction is deleted only after the user confirms.
- Existing success and error toasts remain unchanged.

## Scope

This change applies only to deleting regular transactions from the transaction list. It does not change module item deletion flows or transaction editing.

## Testing

- Verify that clicking the delete icon opens the confirmation modal.
- Verify that clicking `Cancelar` leaves the transaction unchanged.
- Verify that clicking outside the modal leaves the transaction unchanged.
- Verify that clicking `Excluir` removes the transaction and shows the existing success toast.
- Verify that deletion errors still show the existing error toast.
