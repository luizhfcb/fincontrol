export function transactionDateFields(date = new Date()) {
  return {
    date: date.toISOString(),
    month: date.getMonth(),
    year: date.getFullYear(),
  };
}
