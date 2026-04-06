import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildModuleTransactionDocId,
  getDueSubscriptionPosts,
} from '../js/core/subscription-sync.mjs';

test('getDueSubscriptionPosts waits for transactions snapshot before auto-posting', () => {
  const posts = getDueSubscriptionPosts({
    subscriptions: [
      { id: 'prime', name: 'Prime Video', value: 19.9, day: 5 },
    ],
    now: new Date('2026-04-06T15:26:00Z'),
    viewedMonth: 3,
    viewedYear: 2026,
    transactionsLoaded: false,
    existingRefs: new Set(),
    pendingRefs: new Set(),
  });

  assert.deepEqual(posts, []);
});

test('getDueSubscriptionPosts returns only due subscriptions that are not already tracked', () => {
  const posts = getDueSubscriptionPosts({
    subscriptions: [
      { id: 'prime', name: 'Prime Video', value: 19.9, day: 5 },
      { id: 'spotify', name: 'Spotify', value: 40, day: 7 },
      { id: 'max', name: 'Max', value: 18, day: 6 },
    ],
    now: new Date('2026-04-06T15:26:00Z'),
    viewedMonth: 3,
    viewedYear: 2026,
    transactionsLoaded: true,
    existingRefs: new Set(['subscription:prime:2026-04']),
    pendingRefs: new Set(['subscription:max:2026-04']),
  });

  assert.deepEqual(posts, []);
});

test('buildModuleTransactionDocId is deterministic for the same automatic entry', () => {
  assert.equal(
    buildModuleTransactionDocId('user-123', 'subscription:prime:2026-04'),
    buildModuleTransactionDocId('user-123', 'subscription:prime:2026-04'),
  );

  assert.notEqual(
    buildModuleTransactionDocId('user-123', 'subscription:prime:2026-04'),
    buildModuleTransactionDocId('user-123', 'subscription:spotify:2026-04'),
  );
});
