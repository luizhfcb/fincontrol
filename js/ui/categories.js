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

/** Escapa texto para uso seguro em HTML/atributos. */
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Constrói o seletor de categoria (gatilho + dropdown) no modal de nova transação.
 * Em vez de listar todos os chips, mostra a categoria escolhida e abre a lista ao clicar.
 * Inclui a opção "Nova categoria" para criação inline.
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

    const options = categories.map((cat) => {
      const on = cat.name === state.selectedCategory;
      return `
        <button type="button" class="cat-option${on ? ' on' : ''}" role="option"
                data-cat="${esc(cat.name)}"
                onclick="pickCat('${cat.name.replace(/'/g, "\\'")}', this)">
          <span>${esc(cat.name)}</span>
          <svg class="cat-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </button>`;
    }).join('');

    row.innerHTML = `
      <div class="cat-select" id="catSelect-${rowId}">
        <button type="button" class="cat-trigger" onclick="toggleCatDropdown('${rowId}')" aria-haspopup="listbox">
          <span class="cat-trigger-label">${esc(state.selectedCategory)}</span>
          <svg class="cat-trigger-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div class="cat-dropdown" id="catDropdown-${rowId}" role="listbox">
          ${options}
          <button type="button" class="cat-option cat-option-new" onclick="openInlineCatInput('${rowId}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Nova categoria</span>
          </button>
        </div>
      </div>`;
  });
}

/** Abre/fecha o dropdown de categorias; fecha ao clicar fora. */
export function toggleCatDropdown(rowId) {
  const drop = document.getElementById(`catDropdown-${rowId}`);
  if (!drop) return;
  const willOpen = !drop.classList.contains('open');
  document.querySelectorAll('.cat-dropdown.open').forEach((d) => d.classList.remove('open'));
  if (!willOpen) return;
  drop.classList.add('open');
  setTimeout(() => {
    const onDoc = (event) => {
      const wrap = drop.closest('.cat-select');
      if (!wrap || !wrap.contains(event.target)) {
        drop.classList.remove('open');
        document.removeEventListener('click', onDoc);
      }
    };
    document.addEventListener('click', onDoc);
  }, 0);
}

/**
 * Abre o formulário inline de criação de categoria dentro da linha de categorias.
 */
export function openInlineCatInput(rowId) {
  // Fecha o dropdown e remove qualquer form inline anterior
  document.querySelectorAll('.cat-dropdown.open').forEach((d) => d.classList.remove('open'));
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
 * Seleciona uma categoria: atualiza o rótulo do gatilho, marca a opção ativa
 * nos dois seletores (texto e áudio) e fecha o dropdown.
 */
export function pickCategory(category) {
  state.selectedCategory = category;
  document.querySelectorAll('.cat-trigger-label').forEach((label) => {
    label.textContent = category;
  });
  document.querySelectorAll('.cat-option[data-cat]').forEach((opt) => {
    opt.classList.toggle('on', opt.dataset.cat === category);
  });
  document.querySelectorAll('.cat-dropdown.open').forEach((d) => d.classList.remove('open'));
}
