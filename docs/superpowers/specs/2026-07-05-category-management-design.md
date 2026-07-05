# Category Management Design

## Context

Users can create categories, but category management is incomplete. Existing code supports adding and removing categories in the modules area, but renaming is missing and the management UI is hard to discover.

## Decision

Add category management inside the existing `Limites & Categorias` area. Users can create, rename, and delete categories from one place.

## Behavior

- Show a `Categorias` section in the limits/categories screen.
- Each category row shows the category name, type, edit action, and delete action.
- Creating a category keeps the existing form behavior.
- Renaming a category opens a modal with name and type fields.
- If a rename changes the name, ask whether old transactions using the previous category should also be updated.
- Deleting a category asks whether old transactions should stay unchanged or move to `Outros`.
- Updating old transactions changes only the transaction category field, not values, dates, or descriptions.
- If old transactions are not updated, existing records keep their historical category text.

## Scope

This applies to categories stored in `state.modules.categories` and regular transactions in the `transactions` collection. It does not change limits, bills, subscriptions, stock, or authentication behavior.

## Testing

- Verify categories appear in `Limites & Categorias` on mobile and desktop.
- Verify creating a category persists and appears in transaction modals.
- Verify renaming without updating old transactions leaves old transaction categories unchanged.
- Verify renaming with old transaction update changes matching transaction categories.
- Verify deleting without updating old transactions leaves old transaction categories unchanged.
- Verify deleting with update changes matching transaction categories to `Outros`.
