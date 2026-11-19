export function listStockAlerts(modules) {
  return (modules?.stockItems || []).filter((item) => Number(item?.qty ?? 0) <= Number(item?.min ?? 0));
}

export function countStockAlerts(modules) {
  return listStockAlerts(modules).length;
}
