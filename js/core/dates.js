/**
 * CONTRATO DE DATAS DAS TRANSAÇÕES
 * ────────────────────────────────
 * Toda transação grava TRÊS campos derivados do MESMO instante local:
 *
 *   - date:  ISO string (toISOString → UTC). Timestamp exato. Usado para
 *            ordenação e para o dia exibido no mapa de calor, que re-deriva
 *            o dia com `new Date(date)` no fuso LOCAL do dispositivo.
 *   - month: mês local (0-11). FONTE DA VERDADE de a que mês a transação
 *            pertence. Todos os filtros usam month+year — nunca `date`.
 *            Ver getMonthlyTransactions() em utils.js.
 *   - year:  ano local.
 *
 * Por que month/year separados e não só `date`?
 *   `date` é UTC; derivar o mês dele com getUTCMonth daria mês errado perto
 *   da virada (23h de 31/07 local = 01/08 UTC). Guardar month/year locais
 *   fixa o mês no momento da gravação. O round-trip com o heatmap fecha
 *   desde que o dispositivo não troque de fuso entre gravar e ler.
 *
 * REGRA: gere sempre os três com transactionDateFields() para não divergirem.
 */
export function transactionDateFields(date = new Date()) {
  return {
    date: date.toISOString(),
    month: date.getMonth(),
    year: date.getFullYear(),
  };
}
