/**
 * Reduz a lista de categorias a `limit` fatias do donut. O excedente vira uma
 * única fatia agregada.
 *
 * O rótulo do agregado NÃO pode ser "Outros": esse é o nome de uma categoria
 * real do app, e usá-lo aqui fazia o dashboard exibir um gasto em "Outros" que
 * não existia em nenhuma transação (e ainda somava a categoria real ao
 * agregado). O agregado agora se identifica como tal ("+3 categorias") e carrega
 * a lista do que somou, para o tooltip explicar a origem do valor.
 *
 * @param {Array<[string, number]>} sortedCategories pares [categoria, valor], maior primeiro
 * @param {number} limit número máximo de fatias
 * @returns {Array<[string, number, string[]|undefined]>} [rótulo, valor, agrupadas]
 */
export function compactDonutCategories(sortedCategories, limit = 6) {
  const positive = sortedCategories.filter(([, value]) => Number(value) > 0);
  if (positive.length <= limit) return positive.map(([category, value]) => [category, value]);

  const visible = positive.slice(0, limit - 1).map(([category, value]) => [category, value]);
  const rest = positive.slice(limit - 1);
  const remainder = rest.reduce((sum, [, value]) => sum + value, 0);
  const names = rest.map(([category]) => category);
  visible.push([`+${rest.length} categorias`, remainder, names]);
  return visible;
}
