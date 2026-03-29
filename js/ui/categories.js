import { CATEGORIES } from '../core/constants.js';
import { state } from '../core/state.js';

export function buildCategories() {
  const categoryRow = document.getElementById('mCatRow');
  if (!categoryRow) {
    return;
  }

  categoryRow.innerHTML = CATEGORIES.map((category) => `
    <button class="ctag${category === state.selectedCategory ? ' on' : ''}" onclick="pickCat('${category}', this)">
      ${category}
    </button>
  `).join('');
}

export function pickCategory(category, element) {
  state.selectedCategory = category;
  document.querySelectorAll('.ctag').forEach((button) => button.classList.remove('on'));
  element?.classList.add('on');
}
