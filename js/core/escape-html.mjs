/**
 * Escapa texto vindo do usuário antes de entrar em template de HTML.
 *
 * Fonte única: o app monta quase toda a UI com innerHTML, e três cópias
 * divergentes desta função (ui-helpers + os dois arquivos de template) eram
 * três chances de uma delas ficar para trás.
 */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
