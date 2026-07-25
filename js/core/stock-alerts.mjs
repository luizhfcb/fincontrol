/**
 * Itens do estoque que atingiram (ou passaram) o mínimo configurado.
 *
 * Regra única para o dashboard, a página de estoque e a versão mobile — antes
 * o dashboard lia `state.stock`, que nunca existiu, e mostrava sempre zero.
 */
export function listStockAlerts(modules) {
  return (modules?.stockItems || []).filter((item) => Number(item?.qty ?? 0) <= Number(item?.min ?? 0));
}

export function countStockAlerts(modules) {
  return listStockAlerts(modules).length;
}
