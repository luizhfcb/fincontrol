# FinControl Security, Integrity, and Maintainability Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the security and financial-integrity defects found in the 2026-07-09 review, restore trustworthy failure handling and historical navigation, and add enough automated coverage to keep those defects from returning.

**Architecture:** Deliver the work in independently releasable phases. First remove executable user data and UTC-derived local dates, then make persistence/API outcomes explicit, restore on-demand historical reads, and finally isolate module persistence behind tested stores before restructuring the large UI module. Preserve the current Vanilla JS/Firebase architecture and PWA behavior; do not introduce a frontend framework.

**Tech Stack:** Vanilla HTML/CSS/JavaScript ES modules, Firebase Authentication and Firestore, Vercel serverless functions, Node.js 20+, `node:test`, Firebase Emulator Suite.

---

## Scope and Decisions

This is a master plan containing all review improvements in dependency order. Each phase must be deployable and reversible on its own.

1. **Security first:** remove user-controlled values from inline JavaScript before adding a stricter Content Security Policy.
2. **Financial correctness second:** use local calendar dates and never display a success message after a rejected write.
3. **Authenticated feedback:** the API receives a Firebase ID token and a feedback document ID, never a caller-supplied email/message as the source of truth.
4. **History on demand:** keep the 12-month real-time window for cost control and fetch older selected months once, merging them into the client cache.
5. **Offline-safe module data:** migrate array-based module state to item documents in subcollections; this avoids whole-document last-write-wins without depending on online-only Firestore transactions.
6. **Tests describe project coverage honestly:** coverage thresholds apply only after the relevant modules become importable under Node; the CI report must list covered files.

Out of scope:

- Visual redesign.
- Migration to React, Vue, TypeScript, or a bundler.
- Changes to the financial business model beyond validation of existing fields.
- Replacing Telegram as the feedback notification channel.

## Delivery Order and Release Gates

| Phase | Tasks | Release gate |
|---|---|---|
| 1 — Critical safety | 1–4 | XSS regression, local-date regression, write-failure behavior, authenticated API tests pass |
| 2 — Data behavior | 5–6 | Old-month navigation and voice parsing regressions pass |
| 3 — Persistence architecture | 7–8 | Emulator migration/rules tests pass; two-tab edits do not overwrite unrelated items |
| 4 — Maintainability | 9–11 | Full CI, smoke tests, audit review, and deployment checklist pass |

## File Structure

### Files to create

- `js/core/local-date.mjs`: local `YYYY-MM-DD` conversion without UTC drift.
- `js/core/month-cache.mjs`: pure month-key, fetch-decision, and transaction-merge helpers.
- `js/core/module-schema.mjs`: module document validation/default normalization and schema version.
- `js/core/module-mutations.mjs`: pure module item operations used by the store and tests.
- `js/ui/transaction-row-template.mjs`: pure transaction row renderer containing data attributes but no executable user input.
- `js/ui/category-options-template.mjs`: pure category-option renderer containing stable IDs but no executable names.
- `js/services/module-store.js`: Firestore/local-cache boundary for module subcollections and migration.
- `api/firebase-admin.mjs`: singleton Firebase Admin initialization for the serverless runtime.
- `api/feedback-handler.mjs`: dependency-injected authenticated feedback request handler.
- `tests/local-date.test.mjs`: timezone regressions.
- `tests/ui-safety.test.mjs`: malicious transaction/category rendering regressions.
- `tests/month-cache.test.mjs`: old-month fetch and merge behavior.
- `tests/feedback-handler.test.mjs`: authentication, ownership, deduplication, throttling, and Telegram failures.
- `tests/module-mutations.test.mjs`: deterministic item-level module changes.
- `tests/firestore-rules.test.mjs`: ownership, payload validation, and module subcollection rules.
- `firebase.json`: emulator configuration used by rules tests.
- `firestore.indexes.json`: indexes required by the historical month query.

### Files to modify

- `package.json`, `package-lock.json`: scripts and test-only dependencies.
- `index.html`: remove remaining static inline handlers after event delegation and add CSP only when compatible.
- `js/core/state.js`: loaded/loading month sets and module-store subscription state.
- `js/core/utils.js`: repair the voice word-boundary expression.
- `js/config/firebase.js`: export `getDocs`, `writeBatch`, and any store primitives actually used.
- `js/services/auth.js`: reset month/module subscriptions and caches on account changes.
- `js/services/transactions.js`: local-date default, explicit save result, and on-demand month fetch.
- `js/services/feedback.js`: send ID token plus persisted feedback document ID.
- `js/ui/modal.js`: local date helper and success-only close/toast behavior.
- `js/ui/tx-list.js`, `js/ui/tx-swipe.js`: safe rendering and delegated transaction actions.
- `js/ui/categories.js`: category selection via stable ID/data attributes.
- `js/ui/navigation.js`: await/load selected historical month.
- `js/ui/modules.js`: consume the store, then split responsibilities while preserving its public API.
- `js/ui/ui-helpers.js`: remain the direct source of `escapeHtml`; no import through `render.js`.
- `api/notify-feedback.mjs`: production composition of authenticated handler dependencies.
- `firestore.rules`: schema validation and nested module collection ownership.
- `.github/workflows/ci.yml`: dependency install, unit tests, syntax checks, audit reporting, and emulator tests.
- `README.md`: development, security, emulator, and deployment instructions.
- `sw.js`: regenerated cache hash only after all application changes are complete.

---

## Task 0: Establish the Baseline and Isolated Branch

**Files:**
- Verify only; no application file changes.

- [ ] **Step 1: Confirm a clean starting point**

Run:

```powershell
git status --short
git branch --show-current
```

Expected: no status entries; current branch recorded in the execution notes.

- [ ] **Step 2: Create an isolated branch/worktree**

Use `superpowers:using-git-worktrees`, with branch name:

```text
codex/code-review-improvements
```

Expected: implementation happens outside the user's current working tree.

- [ ] **Step 3: Record fresh baseline verification**

Run:

```powershell
npm test
npm audit --json
$files = @(rg --files js api scripts tests -g '*.js' -g '*.mjs')
$files | ForEach-Object { node --check $_ }
```

Expected: 27 tests pass before changes, all JavaScript parses, and the audit JSON is saved in execution notes without running `npm audit fix --force`.

---

## Task 1: Remove Stored XSS from Transaction Rows and Categories

**Files:**
- Create: `js/ui/transaction-row-template.mjs`
- Create: `js/ui/category-options-template.mjs`
- Create: `tests/ui-safety.test.mjs`
- Modify: `js/ui/tx-list.js`
- Modify: `js/ui/tx-swipe.js`
- Modify: `js/ui/categories.js`

- [ ] **Step 1: Write failing render-safety tests**

Create `tests/ui-safety.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import { renderTransactionRow } from '../js/ui/transaction-row-template.mjs';
import { renderCategoryOptions } from '../js/ui/category-options-template.mjs';

test('transaction description is text only and never enters an inline handler', () => {
  const payload = "');globalThis.pwned=1;//";
  const html = renderTransactionRow({
    id: 'tx-safe-id', desc: payload, cat: 'Outros', type: 'expense', val: 10,
    date: '2026-07-09T15:00:00.000Z',
  });

  assert.match(html, /data-tx-id="tx-safe-id"/);
  assert.doesNotMatch(html, /onclick=/i);
  assert.doesNotMatch(html, /globalThis\.pwned/);
  assert.match(html, /&#39;\);globalThis\.pwned=1;\/\//);
});

test('category name never enters executable markup', () => {
  const name = `Casa" autofocus onfocus="globalThis.pwned=1`;
  const html = renderCategoryOptions([{ id: 'cat-1', name }], 'cat-1');

  assert.match(html, /data-category-id="cat-1"/);
  assert.doesNotMatch(html, /onclick=/i);
  assert.doesNotMatch(html, /onfocus=/i);
  assert.match(html, /&quot; autofocus onfocus=&quot;/);
});
```

- [ ] **Step 2: Run the new tests and verify the red state**

Run:

```powershell
node --test tests/ui-safety.test.mjs
```

Expected: FAIL because the two renderer modules do not exist.

- [ ] **Step 3: Create pure safe renderers**

Implement renderers with these contracts:

```js
// transaction-row-template.mjs
export function renderTransactionRow(transaction) {
  // User text is inserted only into text nodes through escapeHtml.
  // Actions carry data-action and the stable transaction ID.
  // No onclick/onchange/oninput attribute is returned.
}

// category-options-template.mjs
export function renderCategoryOptions(categories, selectedId) {
  // Names are escaped display text; selection uses data-category-id only.
  // No category name is interpolated into JavaScript or an event attribute.
}
```

The transaction markup must expose:

```html
<div class="tx-swipe" data-tx-id="tx-safe-id">
  <button data-tx-action="edit" type="button">...</button>
  <button data-tx-action="delete" type="button">...</button>
  <div class="tx-row" role="button" tabindex="0">...</div>
</div>
```

- [ ] **Step 4: Delegate transaction actions without passing descriptions through HTML**

In `js/ui/tx-swipe.js`, import `state` and register one click handler:

```js
function onTransactionClick(event) {
  const wrapper = event.target.closest('.tx-swipe[data-tx-id]');
  if (!wrapper) return;

  const id = wrapper.dataset.txId;
  const action = event.target.closest('[data-tx-action]')?.dataset.txAction;
  if (action === 'edit') return window.editTx?.(id);
  if (action === 'delete') return window.delTx?.(id);

  const row = event.target.closest('.tx-row');
  if (!row || Date.now() - swipeJustEnded < 350) return;
  if (wrapper.classList.contains('open-left') || wrapper.classList.contains('open-right')) {
    closeSwipe(wrapper);
    return;
  }

  const transaction = state.transactions.find((item) => item.id === id);
  if (transaction) openTxHistory(transaction.desc);
}
```

Register it once inside `initTxSwipe()` and remove `window.onTxRowClick`.

- [ ] **Step 5: Delegate category selection by stable ID**

After `row.innerHTML` in `buildCategories()`, attach a local listener that resolves the name from the current category collection:

```js
row.onclick = (event) => {
  const option = event.target.closest('[data-category-id]');
  if (!option) return;
  const category = categories.find((item) => item.id === option.dataset.categoryId);
  if (category) pickCategory(category.name);
};
```

The trigger/open-new-category buttons may use listeners or fixed safe action data, but no user-controlled string may enter an inline handler.

- [ ] **Step 6: Verify tests and syntax**

Run:

```powershell
node --test tests/ui-safety.test.mjs
node --check js/ui/tx-list.js
node --check js/ui/tx-swipe.js
node --check js/ui/categories.js
npm test
```

Expected: all commands exit 0; malicious values remain inert display text.

- [ ] **Step 7: Commit the security fix**

```powershell
git add js/ui/transaction-row-template.mjs js/ui/category-options-template.mjs js/ui/tx-list.js js/ui/tx-swipe.js js/ui/categories.js tests/ui-safety.test.mjs
git commit -m "fix(security): remove user data from inline handlers"
```

---

## Task 2: Make Transaction Dates Local-Calendar Safe

**Files:**
- Create: `js/core/local-date.mjs`
- Create: `tests/local-date.test.mjs`
- Modify: `js/ui/modal.js`
- Modify: `js/services/transactions.js`
- Modify: `js/core/dates.js`

- [ ] **Step 1: Write timezone regression tests**

Create `tests/local-date.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('local date input remains July 9 late at night in Sao Paulo', () => {
  const source = `
    import { toLocalDateInputValue } from './js/core/local-date.mjs';
    console.log(toLocalDateInputValue(new Date('2026-07-10T01:30:00.000Z')));
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', source], {
    cwd: process.cwd(),
    env: { ...process.env, TZ: 'America/Sao_Paulo' },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), '2026-07-09');
});

test('invalid date input is rejected instead of normalized to another day', async () => {
  const { parseLocalDateInput } = await import('../js/core/local-date.mjs');
  assert.equal(parseLocalDateInput('2026-02-31'), null);
  assert.equal(parseLocalDateInput('invalid'), null);
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `node --test tests/local-date.test.mjs`

Expected: FAIL because `local-date.mjs` does not exist.

- [ ] **Step 3: Implement strict local-date helpers**

Create `js/core/local-date.mjs`:

```js
export function toLocalDateInputValue(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDateInput(value, timeSource = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (!match || Number.isNaN(timeSource.getTime())) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const result = new Date(
    year, month - 1, day,
    timeSource.getHours(), timeSource.getMinutes(),
    timeSource.getSeconds(), timeSource.getMilliseconds(),
  );
  if (result.getFullYear() !== year || result.getMonth() !== month - 1 || result.getDate() !== day) {
    return null;
  }
  return result;
}
```

- [ ] **Step 4: Replace all `toISOString().slice(0, 10)` date-input defaults**

Use `toLocalDateInputValue()` in `modal.js` for new and edited transactions. Use `parseLocalDateInput()` in `transactions.js`; return a failed save result when the input is invalid rather than silently falling back to the current date.

- [ ] **Step 5: Verify timezone behavior**

Run:

```powershell
node --test tests/local-date.test.mjs
$env:TZ='America/Sao_Paulo'
node --input-type=module -e "import {toLocalDateInputValue} from './js/core/local-date.mjs'; console.log(toLocalDateInputValue(new Date('2026-07-10T01:30:00Z')))"
npm test
```

Expected: helper prints `2026-07-09`; all tests pass.

- [ ] **Step 6: Commit**

```powershell
git add js/core/local-date.mjs js/core/dates.js js/ui/modal.js js/services/transactions.js tests/local-date.test.mjs
git commit -m "fix(dates): use local calendar dates for transactions"
```

---

## Task 3: Propagate Save Failures to the UI

**Files:**
- Create: `tests/transaction-save-result.test.mjs`
- Modify: `js/services/transactions.js`
- Modify: `js/ui/modal.js`

- [ ] **Step 1: Define and test the save-result contract**

The public result must always be one of:

```js
{ ok: true }
{ ok: false, code: 'unauthenticated' | 'invalid-date' | 'write-failed', error?: Error }
```

Create tests around an exported dependency-injected helper in `transactions.js` or a small adjacent pure module. Tests must prove that a rejected writer returns `write-failed` and a resolved writer returns `ok: true`.

- [ ] **Step 2: Run the focused test in the red state**

Run: `node --test tests/transaction-save-result.test.mjs`

Expected: FAIL until the explicit result contract exists.

- [ ] **Step 3: Return explicit results from `saveTransaction()`**

Required behavior:

```js
if (!state.currentUser) return { ok: false, code: 'unauthenticated' };
if (!transactionDate) return { ok: false, code: 'invalid-date' };

try {
  await writeTransaction();
  return { ok: true };
} catch (error) {
  console.error('[Firestore] Erro ao salvar transação:', error);
  setSyncStatus('error');
  return { ok: false, code: 'write-failed', error };
}
```

The service may log/set sync state, but it must not show both error and success toasts.

- [ ] **Step 4: Keep modal contents open on failure**

Both text and audio confirmation flows must follow:

```js
const result = await saveTransaction(/* existing arguments */);
if (!result.ok) {
  showToast('Não foi possível salvar a transação. Tente novamente.', true);
  return;
}
closeModal();
showToast(successMessage);
```

- [ ] **Step 5: Verify with tests and a controlled failure**

Run:

```powershell
node --test tests/transaction-save-result.test.mjs
npm test
```

Manual check: temporarily use browser offline mode with an uncached/unauthorized write path, confirm that the modal remains open and only an error toast appears, then remove the diagnostic condition.

Expected: no success message follows a rejected save.

- [ ] **Step 6: Commit**

```powershell
git add js/services/transactions.js js/ui/modal.js tests/transaction-save-result.test.mjs
git commit -m "fix(transactions): surface write failures to the modal"
```

---

## Task 4: Authenticate, Deduplicate, and Throttle Feedback Notifications

**Files:**
- Create: `api/firebase-admin.mjs`
- Create: `api/feedback-handler.mjs`
- Create: `tests/feedback-handler.test.mjs`
- Modify: `api/notify-feedback.mjs`
- Modify: `js/services/feedback.js`
- Modify: `package.json`, `package-lock.json`
- Modify: `firestore.rules`

- [ ] **Step 1: Move Firebase Admin to the server runtime dependencies**

Run:

```powershell
npm install --save firebase-admin
```

Expected: `firebase-admin` appears under `dependencies`, not only `devDependencies`.

- [ ] **Step 2: Write handler tests before implementation**

`tests/feedback-handler.test.mjs` must cover:

```text
POST without Bearer token -> 401
invalid token -> 401
feedback document owned by another uid -> 403
missing/invalid feedback document -> 404 or 400
same document notified twice -> second call is idempotent and sends nothing
user inside cooldown -> 429
Telegram non-2xx -> 502 and document remains retryable
valid request -> derives email/message from verified data and returns 200
```

Construct the handler with stubs:

```js
const handler = createFeedbackHandler({
  verifyIdToken: async () => ({ uid: 'user-1', email: 'owner@example.com' }),
  getFeedback: async () => ({
    id: 'feedback-1', uid: 'user-1', type: 'bug', message: 'Falha reproduzível', notifiedAt: null,
  }),
  acquireRateLimit: async () => true,
  sendTelegram: async () => ({ ok: true }),
  markNotified: async () => {},
});
```

- [ ] **Step 3: Verify the tests fail**

Run: `node --test tests/feedback-handler.test.mjs`

Expected: FAIL because `createFeedbackHandler` does not exist.

- [ ] **Step 4: Implement the dependency-injected handler**

`createFeedbackHandler()` must:

1. Accept only `POST`.
2. Keep the host/origin check as defense in depth, not authentication.
3. Parse `Authorization: Bearer <Firebase ID token>`.
4. Verify the token.
5. Accept only `{ feedbackId }`, constrained to a Firestore-safe document ID.
6. Load the feedback document using Admin SDK.
7. Require `feedback.uid === decodedToken.uid`.
8. Re-run `validateFeedbackPayload()` against stored data.
9. Return success without sending when `notifiedAt` already exists.
10. Enforce a 60-second per-user cooldown in `feedbackRateLimits/{uid}` using an Admin transaction.
11. Check `telegramResponse.ok`; non-2xx is an error.
12. Set `notifiedAt` only after Telegram accepts the message.

- [ ] **Step 5: Compose production dependencies**

`api/firebase-admin.mjs` must initialize once:

```js
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const app = getApps()[0] || initializeApp();
export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
```

`notify-feedback.mjs` supplies `verifyIdToken`, Firestore reads/transactions, Telegram fetch, and mark-notified operations to the handler factory.

- [ ] **Step 6: Send only a token and document ID from the client**

In `submitFeedback()` retain the returned document reference:

```js
const feedbackRef = await addDoc(collection(db, 'feedback'), payload);
const idToken = await state.currentUser.getIdToken();
await notifyFeedback(feedbackRef.id, idToken);
```

The request body must be `{ feedbackId }`; remove caller-supplied `type`, `message`, and `userEmail` from the API request.

- [ ] **Step 7: Deny client access to server-only rate-limit documents**

Add a rules block:

```text
match /feedbackRateLimits/{uid} {
  allow read, write: if false;
}
```

- [ ] **Step 8: Verify API behavior**

Run:

```powershell
node --test tests/feedback-handler.test.mjs
node --check api/firebase-admin.mjs
node --check api/feedback-handler.mjs
node --check api/notify-feedback.mjs
npm test
npm audit
```

Expected: handler tests pass; audit result is documented. Do not accept a forced major downgrade as an automatic fix.

- [ ] **Step 9: Commit**

```powershell
git add api js/services/feedback.js tests/feedback-handler.test.mjs firestore.rules package.json package-lock.json
git commit -m "fix(feedback): authenticate and throttle notifications"
```

---

## Task 5: Load Older Transaction Months on Demand

**Files:**
- Create: `js/core/month-cache.mjs`
- Create: `tests/month-cache.test.mjs`
- Create: `firestore.indexes.json`
- Modify: `js/core/state.js`
- Modify: `js/config/firebase.js`
- Modify: `js/services/transactions.js`
- Modify: `js/ui/navigation.js`
- Modify: `js/services/auth.js`

- [ ] **Step 1: Write pure cache tests**

Tests must prove:

```js
periodKey(2026, 0) === '2026-01'
shouldFetchPeriod({ loaded: new Set(), loading: new Set(), year: 2025, month: 0 }) === true
shouldFetchPeriod({ loaded: new Set(['2025-01']), loading: new Set(), year: 2025, month: 0 }) === false
mergeTransactions(existing, incoming) deduplicates by id and preserves newer snapshots
```

- [ ] **Step 2: Run focused tests in the red state**

Run: `node --test tests/month-cache.test.mjs`

Expected: FAIL because the month-cache module is absent.

- [ ] **Step 3: Add cache state**

Extend `state` with:

```js
loadedTransactionPeriods: new Set(),
loadingTransactionPeriods: new Set(),
```

Clear both sets on logout/account change.

- [ ] **Step 4: Implement a bounded month query**

Add `loadTransactionMonth(year, month)` using:

```js
const start = new Date(year, month, 1);
const end = new Date(year, month + 1, 1);
query(
  collection(db, 'transactions'),
  where('uid', '==', state.currentUser.uid),
  where('date', '>=', start.toISOString()),
  where('date', '<', end.toISOString()),
);
```

Merge documents by ID, mark the period loaded even when empty, always clear the loading marker in `finally`, and show an error without replacing already-loaded data when the query fails.

- [ ] **Step 5: Await the month before rendering navigation results**

Make `changeMonth(delta)` async:

```js
updateSelectedPeriod(delta);
await loadTransactionMonth(state.currentYear, state.currentMonth);
refreshUI();
renderModules();
```

Disable both month navigation button pairs while the selected month is loading and re-enable them in `finally`.

- [ ] **Step 6: Add the required composite index declaration**

Add the `transactions` index for ascending `uid` and ascending `date` in `firestore.indexes.json`, then link it from `firebase.json`.

- [ ] **Step 7: Verify old-month behavior**

Run:

```powershell
node --test tests/month-cache.test.mjs
npm test
```

Manual check: navigate to a month older than 12 months that contains a known transaction, confirm it appears, return to the month, and confirm no second read is issued during the same session.

- [ ] **Step 8: Commit**

```powershell
git add js/core/month-cache.mjs js/core/state.js js/config/firebase.js js/services/transactions.js js/services/auth.js js/ui/navigation.js tests/month-cache.test.mjs firebase.json firestore.indexes.json
git commit -m "fix(history): fetch older transaction months on demand"
```

---

## Task 6: Repair and Extend Voice Parsing

**Files:**
- Modify: `js/core/utils.js`
- Modify: `tests/voice-input.test.mjs`

- [ ] **Step 1: Add exact-description regressions**

Append:

```js
test('parseVoiceInput removes payment filler words from description', () => {
  assert.equal(parseVoiceInput('gastei 50 reais no mercado').description, 'Mercado');
  assert.equal(parseVoiceInput('paguei 25 reais de almoço').description, 'Almoço');
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `node --test tests/voice-input.test.mjs`

Expected: FAIL with the current descriptions containing `Gastei reais`/`Paguei reais`.

- [ ] **Step 3: Replace control characters with literal word boundaries**

The expression must be exactly:

```js
.replace(/\b(reais|real|paguei|gastei|comprei|recebi|custou|ganhei|valor|de|por|no|na|um|uma|o|a)\b/gi, ' ')
```

Verify the source contains no backspace byte (`0x08`).

- [ ] **Step 4: Verify and commit**

```powershell
node --test tests/voice-input.test.mjs
npm test
git add js/core/utils.js tests/voice-input.test.mjs
git commit -m "fix(voice): restore filler-word boundaries"
```

---

## Task 7: Introduce Item-Level, Offline-Safe Module Persistence

**Files:**
- Create: `js/core/module-schema.mjs`
- Create: `js/core/module-mutations.mjs`
- Create: `js/services/module-store.js`
- Create: `tests/module-mutations.test.mjs`
- Modify: `js/config/firebase.js`
- Modify: `js/core/state.js`
- Modify: `js/ui/modules.js`
- Modify: `js/services/auth.js`
- Modify: `firestore.rules`

### Target Firestore Layout

```text
modules/{uid}                         # metadata: schemaVersion, onboarding
modules/{uid}/categories/{itemId}
modules/{uid}/limits/{itemId}
modules/{uid}/subscriptions/{itemId}
modules/{uid}/stockItems/{itemId}
modules/{uid}/bills/{itemId}
```

Each item document includes `uid`, its stable `id`, and only fields belonging to that item. Separate documents prevent edits in one tab/domain from overwriting unrelated edits in another tab and retain Firestore offline writes.

- [ ] **Step 1: Write pure mutation/schema tests**

Cover:

```text
normalization rejects missing IDs and non-finite/negative monetary values
subscription/bill day must be 1..31
stock quantity/minimum must be non-negative integers
add operation is idempotent by item ID
edit operation changes only the selected item
remove operation leaves all other items unchanged
```

- [ ] **Step 2: Run focused tests in the red state**

Run: `node --test tests/module-mutations.test.mjs`

Expected: FAIL because schema/mutation modules are absent.

- [ ] **Step 3: Implement validated module schemas**

Use shared guards:

```js
export const MODULE_COLLECTIONS = ['categories', 'limits', 'subscriptions', 'stockItems', 'bills'];
export const MODULE_SCHEMA_VERSION = 2;

export function isPositiveMoney(value) {
  return Number.isFinite(value) && value > 0;
}

export function isDueDay(value) {
  return Number.isInteger(value) && value >= 1 && value <= 31;
}
```

Every add/edit form must reject invalid values before calling the store; imported/remote values must also be normalized before rendering.

- [ ] **Step 4: Implement a store boundary**

`module-store.js` owns:

```js
subscribeModules(uid, onChange, onError)
addModuleItem(uid, collectionName, item)
updateModuleItem(uid, collectionName, itemId, patch)
removeModuleItem(uid, collectionName, itemId)
updateModuleMetadata(uid, patch)
migrateLegacyModuleDocument(uid)
disposeModuleSubscriptions()
```

UI modules must not call `setDoc`, `updateDoc`, or `deleteDoc` directly after this task.

- [ ] **Step 5: Implement idempotent migration from schema v1**

Migration requirements:

1. Read `modules/{uid}`.
2. If `schemaVersion >= 2`, skip.
3. Validate each legacy array item.
4. Write each valid item to its deterministic subcollection document with a batch.
5. Preserve `onboarding` in the root metadata.
6. Set `schemaVersion: 2` only in the final batch operation.
7. Keep legacy arrays for one release as rollback data; remove them only in a later separately approved cleanup.
8. Re-running migration produces the same documents without duplicates.

- [ ] **Step 6: Adapt `modules.js` to store operations**

Replace in-place array mutation plus whole-document `persist()` with explicit store calls. UI may apply an optimistic local item change, but the Firestore listeners remain authoritative and errors must restore/re-render state with an error toast.

- [ ] **Step 7: Add nested ownership rules**

Rules must require authenticated ownership at the root and every nested item:

```text
match /modules/{uid} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
  match /{moduleType}/{itemId} {
    allow read, write: if request.auth != null
      && request.auth.uid == uid
      && moduleType in ['categories', 'limits', 'subscriptions', 'stockItems', 'bills'];
  }
}
```

Task 8 adds field-level rule tests and restrictions.

- [ ] **Step 8: Verify migration and two-tab behavior**

Run:

```powershell
node --test tests/module-mutations.test.mjs
npm test
```

Manual acceptance:

1. Open the same account in two tabs.
2. Add a subscription in tab A and a bill in tab B before either tab is refreshed.
3. Confirm both items appear in both tabs.
4. Go offline, add one item, return online, and confirm it syncs once.
5. Reload twice and confirm migration creates no duplicates.

- [ ] **Step 9: Commit**

```powershell
git add js/core/module-schema.mjs js/core/module-mutations.mjs js/services/module-store.js js/config/firebase.js js/core/state.js js/ui/modules.js js/services/auth.js tests/module-mutations.test.mjs firestore.rules
git commit -m "refactor(modules): persist module items independently"
```

---

## Task 8: Add Firestore Emulator Security Tests

**Files:**
- Create: `firebase.json`
- Create: `tests/firestore-rules.test.mjs`
- Modify: `firestore.rules`
- Modify: `package.json`, `package-lock.json`
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Install test dependencies**

Run:

```powershell
npm install --save-dev firebase-tools @firebase/rules-unit-testing
```

- [ ] **Step 2: Add an emulator test script**

Add:

```json
{
  "scripts": {
    "test": "node --test tests/*.test.mjs",
    "test:rules": "firebase emulators:exec --only firestore \"node --test tests/firestore-rules.test.mjs\""
  }
}
```

- [ ] **Step 3: Write failing ownership and schema tests**

Cover at minimum:

```text
owner can create/read/update/delete own transaction
user cannot read or mutate another user's transaction
transaction create rejects invalid type, non-positive/non-number val, blank/oversized desc, invalid month/year, and foreign uid
transaction update cannot change uid
owner can access only modules/{own uid} and its allowed subcollections
module item rejects mismatched uid and invalid numeric/day fields
feedback create accepts valid payload and rejects extra privileged fields such as notifiedAt
feedback read/update/delete is denied to clients
feedbackRateLimits is denied to every client
```

- [ ] **Step 4: Harden rules until tests pass**

Use reusable rule functions for signed-in ownership and type checks. Keep server-only fields writable only through Admin SDK.

- [ ] **Step 5: Run emulator and full tests**

```powershell
npm run test:rules
npm test
```

Expected: all allow/deny assertions and unit tests pass.

- [ ] **Step 6: Add rules tests to CI and commit**

CI order:

```text
npm ci
npm test
npm run test:rules
syntax check
```

Commit:

```powershell
git add firebase.json firestore.rules tests/firestore-rules.test.mjs package.json package-lock.json .github/workflows/ci.yml
git commit -m "test(firestore): verify ownership and document schemas"
```

---

## Task 9: Split `modules.js` and Remove the Circular Import

**Files:**
- Create: `js/ui/module-renderers.js`
- Create: `js/ui/module-forms.js`
- Create: `js/services/module-auto-post.js`
- Modify: `js/ui/modules.js`
- Modify: `js/ui/render.js`
- Modify: `js/ui/ui-helpers.js`
- Modify: existing module template tests as required by moved exports.

- [ ] **Step 1: Remove the circular import immediately**

Change `modules.js` from:

```js
import { escapeHtml } from './render.js';
```

to:

```js
import { escapeHtml } from './ui-helpers.js';
```

Run `npm test` and syntax checks before any file movement.

- [ ] **Step 2: Lock current public behavior with tests**

Extend template/mutation tests to cover limits, subscriptions, bills, stock, categories, automatic subscription posting decisions, and bill posting references before moving functions.

- [ ] **Step 3: Move responsibilities without changing public APIs**

Target boundaries:

```text
modules.js             facade: initModules, renderModules, exported window-facing actions
module-renderers.js    DOM rendering and view-model calculation only
module-forms.js        form definitions, validation, modal coordination
module-store.js        Firestore/local cache and migration only
module-auto-post.js    subscription/bill automatic transaction orchestration
module-mutations.mjs   pure deterministic state changes
```

`main.js` imports remain stable through the `modules.js` facade during this refactor.

- [ ] **Step 4: Verify after each extraction**

After moving each responsibility:

```powershell
npm test
node --check js/ui/modules.js
node --check js/ui/module-renderers.js
node --check js/ui/module-forms.js
node --check js/services/module-auto-post.js
```

Expected: no public export changes and all tests remain green after every move.

- [ ] **Step 5: Enforce size/boundary acceptance**

Acceptance:

- `modules.js` is a facade under 300 lines.
- UI files contain no direct Firebase write calls.
- Store files contain no `innerHTML` or DOM queries.
- Pure core modules import neither DOM nor Firebase.
- No `modules.js ↔ render.js` import cycle remains.

- [ ] **Step 6: Commit**

```powershell
git add js/ui/modules.js js/ui/module-renderers.js js/ui/module-forms.js js/services/module-auto-post.js js/ui/render.js js/ui/ui-helpers.js tests
git commit -m "refactor(modules): separate store forms rendering and auto-posting"
```

---

## Task 10: Improve Coverage, CI, CSP Readiness, and Dependency Hygiene

**Files:**
- Modify: `package.json`, `package-lock.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `index.html`
- Modify: `README.md`
- Modify: tests created in previous tasks.

- [ ] **Step 1: Add explicit verification scripts**

Add scripts equivalent to:

```json
{
  "scripts": {
    "test": "node --test tests/*.test.mjs",
    "test:coverage": "node --test --experimental-test-coverage tests/*.test.mjs",
    "test:rules": "firebase emulators:exec --only firestore \"node --test tests/firestore-rules.test.mjs\"",
    "check:syntax": "node scripts/check-syntax.mjs",
    "verify": "npm run check:syntax && npm test && npm run test:rules"
  }
}
```

If cross-platform command quoting becomes fragile, create `scripts/check-syntax.mjs` rather than embedding PowerShell/Bash in `package.json`.

- [ ] **Step 2: Make coverage reporting honest**

CI must print the instrumented file table. Do not advertise a global percentage as project-wide until service/UI modules are importable and instrumented. Initial thresholds apply to pure/new modules:

```text
local-date.mjs: 100% lines/branches
month-cache.mjs: 100% lines, at least 90% branches
module-schema.mjs and module-mutations.mjs: at least 95% lines/branches
feedback-handler.mjs: at least 90% lines/branches
```

- [ ] **Step 3: Remove remaining inline handlers before adding CSP**

Scan:

```powershell
rg -n "on(click|change|input|keydown)=" index.html js
```

Move remaining handlers to `main.js`/delegated listeners. Only then add a CSP that permits Firebase/Google resources required by the app while blocking inline script execution. Validate login, Firestore, fonts, service worker, and Telegram API calls under the policy.

- [ ] **Step 4: Review dependency audit without destructive automation**

Run:

```powershell
npm audit --json
npm outdated
npm ls firebase-admin @google-cloud/firestore google-gax uuid gaxios --all
```

Rules:

- Do not run `npm audit fix --force`.
- Do not downgrade `firebase-admin` merely to satisfy the audit suggestion.
- Upgrade only to a compatible release that removes the vulnerable path, then rerun API, backup, emulator, and full tests.
- If no compatible fix exists, document affected package/path, why the vulnerable API is or is not reachable, and a review date.

- [ ] **Step 5: Document development and security workflows**

README must cover:

```text
npm install / npm ci
npm test / npm run test:rules / npm run verify
local server command
required Firebase/Vercel environment variables
serviceAccountKey.json handling and rotation guidance
feedback authentication flow
module schema migration and rollback window
cache-bust command required before deploy
```

- [ ] **Step 6: Commit**

```powershell
git add package.json package-lock.json .github/workflows/ci.yml index.html README.md scripts tests
git commit -m "chore(quality): strengthen verification and security checks"
```

---

## Task 11: Full Verification, Cache Bust, and Deployment Checklist

**Files:**
- Modify generated cache references only: `index.html`, `sw.js`
- Verify all changed files.

- [ ] **Step 1: Run the complete automated gate**

```powershell
npm ci
npm run check:syntax
npm test
npm run test:rules
npm run test:coverage
npm audit --json
git diff --check
```

Expected:

- all tests pass with zero skipped critical security tests;
- all JS/MJS files parse;
- Firestore allow/deny cases pass;
- coverage table includes the new pure/API modules;
- audit status is either clean or explicitly documented with no high/critical production vulnerability;
- `git diff --check` emits no output.

- [ ] **Step 2: Run desktop/mobile smoke tests**

Check in authenticated and signed-out states:

```text
Google login/logout
create/edit/delete income and expense
create transaction at local time after 21:00 and confirm same calendar day
simulate rejected write and confirm modal remains open
malicious apostrophe/quote descriptions and category names render inertly
navigate to a month older than 12 months
voice phrases produce clean descriptions
send feedback, reject unauthenticated request, and verify duplicate suppression
two-tab module edits and offline reconciliation
light/dark themes at mobile and desktop widths
PWA reload/offline shell after one successful online load
```

- [ ] **Step 3: Verify Firestore migrations and rollback data**

Before production deployment:

1. Run `npm run backup` with the ignored service account key.
2. Record document counts for `transactions`, root `modules`, nested module item collections, and `feedback`.
3. Test schema-v1 migration against emulator/fixture data.
4. Confirm legacy arrays remain available for the agreed one-release rollback window.

- [ ] **Step 4: Regenerate cache version last**

Run:

```powershell
npm run cache-bust
git diff -- index.html sw.js
```

Expected: only intended content hashes/cache names change; no application behavior is edited in this step.

- [ ] **Step 5: Run the automated gate again after cache generation**

```powershell
npm run verify
npm test
git diff --check
git status --short
```

Expected: all checks pass; status contains only intentional implementation/test/documentation files.

- [ ] **Step 6: Final commit**

```powershell
git add index.html sw.js
git commit -m "chore(pwa): refresh cache after reliability improvements"
```

- [ ] **Step 7: Deployment acceptance**

Deploy Phase 1 separately from the module-schema migration when possible. After deployment, verify one real authenticated account, one feedback notification, one old-month query, and service-worker activation. Monitor Firestore/API errors before enabling/removing any rollback data.

---

## Final Acceptance Criteria

- [ ] No user-controlled description, category name, plan name, bill name, or item name is interpolated into executable JavaScript or an event-handler attribute.
- [ ] Transactions created/edited late at night retain the user's local calendar date.
- [ ] Rejected Firestore writes never produce a success toast or close a form containing recoverable input.
- [ ] Feedback notifications require a valid Firebase token, use persisted server-read data, enforce ownership/cooldown, deduplicate, and check Telegram HTTP status.
- [ ] Months older than the 12-month live window load on demand and remain cached for the session.
- [ ] Voice filler words are removed with literal regex word boundaries and exact-description tests.
- [ ] Concurrent/offline module edits operate on item documents and do not overwrite unrelated module data.
- [ ] Firestore rules have emulator tests for ownership, schema restrictions, and server-only collections/fields.
- [ ] `modules.js` is a small facade with no circular import through `render.js`.
- [ ] CI runs syntax, unit, emulator-rules, and transparent coverage checks.
- [ ] Dependency audit findings are fixed compatibly or documented with reachability and review date.
- [ ] Cache-bust runs only after the final application content is verified.

## Self-Review

- **Review coverage:** all seven prioritized review findings are mapped to Tasks 1–8; test coverage, file size/cycle, dependency audit, CI, CSP, and deployment improvements are mapped to Tasks 9–11.
- **Ordering:** security/date/save-result changes do not depend on the module migration; module migration waits for schema/mutation tests and has an explicit rollback window.
- **Data safety:** no legacy module arrays are deleted in the same release that introduces schema v2.
- **Type consistency:** transaction IDs, category IDs, feedback IDs, month keys, save-result codes, and module collection names use one definition throughout the plan.
- **Placeholder scan:** the plan contains no unresolved placeholders or ambiguous implementation steps.
