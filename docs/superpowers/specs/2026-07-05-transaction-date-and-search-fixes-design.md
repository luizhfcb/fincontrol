# Transaction Date And Search Fixes Design

## Context

Transactions are always saved with the current date, which makes late entry inconvenient. Editing also does not allow changing the transaction date. The mobile nav label `Limites` no longer matches the new category management behavior. The transaction search clear button resets state but does not clear the visible input value.

## Decision

Use a native `type="date"` input in the transaction modal. Rename the mobile `Limites` tab label to `Categorias`. Update search clearing to also clear visible inputs.

## Behavior

- New transaction modal defaults the date field to today.
- Editing a transaction fills the date field with the transaction date.
- Saving a transaction uses the selected date for `date`, `month`, and `year`.
- Clearing transaction search empties both mobile and desktop search input values.
- The mobile nav tab keeps its existing route but displays `Categorias`.

## Testing

- Create a transaction with a past date and verify it appears in the selected month.
- Edit a transaction date and verify its month/year update.
- Type in transaction search and click `X`; verify the input becomes empty.
- Verify mobile nav shows `Categorias`.
