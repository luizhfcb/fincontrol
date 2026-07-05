import { DEFAULT_WATER_CATEGORIES } from '../core/constants.js';
import { state } from '../core/state.js';
import { showToast } from './feedback.js';

/**
 * Retorna a lista de categorias dinâmicas.
 * Se state.modules.categories estiver vazio, usa os padrões da distribuidora.
 */
function getCategories() {
  const dynamic = state.modules?.categories;
  if (dynamic && dynamic.length > 0) return dynamic;
  return DEFAULT_WATER_CATEGORIES;
}

/**
 * Constrói os botões de categoria no modal de nova transação.
 * Inclui o botão "+ Nova" para criação inline.
 */
export function buildCategories() {
  const categories = getCategories();

  ['mCatRow', 'mCatRowAudio'].forEach((rowId) => {
    const row = document.getElementById(rowId);
    if (!row) return;

    // Garante que a categoria selecionada é válida
    if (!categories.find((c) => c.name === state.selectedCategory)) {
      state.selectedCategory = categories[0]?.name || 'Outros';
    }

    row.innerHTML = categories.map((cat) => `
      <button
        class="ctag${cat.name === state.selectedCategory ? ' on' : ''}"
        onclick="pickCat('${cat.name.replace(/'/g, "\\'")}', this)"
      >${cat.name}</button>
    `).join('') + `
      <button class="ctag ctag-new" id="addCatTrigger-${rowId}" onclick="openInlineCatInput('${rowId}')">
        + Nova
      </button>
    `;
  });
}

/**
 * Abre o formulário inline de criação de categoria dentro da linha de categorias.
 */
export function openInlineCatInput(rowId) {
  // Remove qualquer form inline anterior
  document.querySelectorAll('.inline-cat-form').forEach((el) => el.remove());

  const row = document.getElementById(rowId);
  if (!row) return;

  const form = document.createElement('div');
  form.className = 'inline-cat-form';
  form.innerHTML = `
    <input
      class="finput inline-cat-input"
      id="inlineCatInput-${rowId}"
      type="text"
      placeholder="Nome da categoria…"
      autocomplete="off"
      maxlength="32"
    />
    <div class="inline-cat-actions">
      <button class="btn-confirm income inline-cat-save" onclick="saveInlineCategory('${rowId}')">Salvar</button>
      <button class="btn-cancel inline-cat-cancel" onclick="cancelInlineCatInput()">Cancelar</button>
    </div>
  `;

  row.after(form);

  const input = document.getElementById(`inlineCatInput-${rowId}`);
  input?.focus();
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveInlineCategory(rowId);
    if (e.key === 'Escape') cancelInlineCatInput();
  });
}

/**
 * Cancela e remove o formulário inline.
 */
export function cancelInlineCatInput() {
  document.querySelectorAll('.inline-cat-form').forEach((el) => el.remove());
}

/**
 * Salva a nova categoria em state.modules.categories e persiste no Firestore.
 */
export async function saveInlineCategory(rowId) {
  const input = document.getElementById(`inlineCatInput-${rowId}`);
  const name = input?.value?.trim();

  if (!name) {
    showToast('Digite um nome para a categoria.', true);
    input?.focus();
    return;
  }

  if (!state.modules) {
    showToast('Aguarde o carregamento dos dados.', true);
    return;
  }

  const exists = state.modules.categories.find(
    (c) => c.name.toLowerCase() === name.toLowerCase(),
  );
  if (exists) {
    showToast('Essa categoria já existe.', true);
    input?.focus();
    return;
  }

  // Se ainda usando defaults, migra para state.modules
  if (state.modules.categories.length === 0) {
    state.modules.categories.push(...DEFAULT_WATER_CATEGORIES.map((c) => ({ ...c })));
  }

  state.modules.categories.push({
    id: Date.now().toString(),
    name,
    type: 'expense',
  });

  // Persiste no Firestore via modules
  const { persistModules } = await import('./modules.js');
  await persistModules();

  // Seleciona a nova categoria e reconstrói
  state.selectedCategory = name;
  cancelInlineCatInput();
  buildCategories();
  showToast(`Categoria "${name}" criada!`);
}

/**
 * Seleciona uma categoria e destaca o botão correspondente.
 */
export function pickCategory(category, element) {
  state.selectedCategory = category;
  document.querySelectorAll('.ctag').forEach((btn) => {
    btn.classList.toggle('on', btn.textContent.trim() === category);
  });
  if (element) element.classList.add('on');
}
