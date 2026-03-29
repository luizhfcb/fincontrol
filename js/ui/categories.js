import { CATEGORIES } from '../core/constants.js';
import { state } from '../core/state.js';

export function buildCategories() {
  ['mCatRow', 'mCatRowAudio'].forEach((id) => {
    const categoryRow = document.getElementById(id);
    if (!categoryRow) {
      return;
    }

    categoryRow.innerHTML = CATEGORIES.map((category) => `
      <button class="ctag${category === state.selectedCategory ? ' on' : ''}" onclick="pickCat('${category}', this)">
        ${category}
      </button>
    `).join('');
  });
}

export function pickCategory(category, element) {
  state.selectedCategory = category;
  document.querySelectorAll('.ctag').forEach((button) => {
    button.classList.toggle('on', button.textContent.trim() === category);
  });

  if (element) {
    element.classList.add('on');
  }
}
