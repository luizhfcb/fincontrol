const FIRESTORE_SAFE_SEGMENT = /[^A-Za-z0-9_.-]/g;

function buildPeriodKey(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export function getDueSubscriptionPosts({
  subscriptions = [],
  now = new Date(),
  viewedMonth,
  viewedYear,
  transactionsLoaded,
  existingRefs = new Set(),
  pendingRefs = new Set(),
}) {
  const isViewingCurrentMonth = now.getMonth() === viewedMonth && now.getFullYear() === viewedYear;
  if (!transactionsLoaded || !isViewingCurrentMonth) {
    return [];
  }

  const periodKey = buildPeriodKey(viewedYear, viewedMonth);

  return subscriptions
    .filter((subscription) => now.getDate() >= subscription.day)
    .map((subscription) => ({
      subscription,
      ref: `subscription:${subscription.id}:${periodKey}`,
    }))
    .filter(({ ref }) => !existingRefs.has(ref) && !pendingRefs.has(ref));
}

export function buildModuleTransactionDocId(uid, ref) {
  return `module_${uid}_${ref}`.replace(FIRESTORE_SAFE_SEGMENT, '_');
}
