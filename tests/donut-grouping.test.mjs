import test from 'node:test';
import assert from 'node:assert/strict';
import { compactDonutCategories } from '../js/ui/donut-grouping.mjs';

// Regressão: o excedente do donut era rotulado "Outros", que também é o nome de
// uma categoria real. O dashboard passava a mostrar um gasto em "Outros" que não
// existia em nenhuma transação, e ainda somava a categoria real ao agregado.
test('the overflow slice is not named after the real "Outros" category', () => {
  const categories = [
    ['Casa', 1200], ['Alimentação', 800], ['Transporte', 400],
    ['Saúde', 300], ['Lazer', 200], ['Educação', 100], ['Pets', 50],
  ];
  const compact = compactDonutCategories(categories);
  const labels = compact.map(([label]) => label);

  assert.equal(compact.length, 6);
  assert.ok(!labels.includes('Outros'), 'aggregate must not borrow a real category name');
  assert.equal(labels[5], '+2 categorias');
});

test('the overflow slice carries the categories it summed', () => {
  const categories = [
    ['Casa', 1200], ['Alimentação', 800], ['Transporte', 400],
    ['Saúde', 300], ['Lazer', 200], ['Educação', 100], ['Pets', 50],
  ];
  const [, value, grouped] = compactDonutCategories(categories).at(-1);

  assert.deepEqual(grouped, ['Educação', 'Pets']);
  assert.equal(value, 150);
});

test('a real "Outros" category is never merged into the aggregate', () => {
  const categories = [
    ['Casa', 1200], ['Outros', 900], ['Alimentação', 800], ['Transporte', 400],
    ['Saúde', 300], ['Lazer', 200], ['Pets', 50],
  ];
  const compact = compactDonutCategories(categories);
  const outros = compact.find(([label]) => label === 'Outros');

  assert.deepEqual(outros, ['Outros', 900], 'real category keeps its own value');
  assert.deepEqual(compact.at(-1)[2], ['Lazer', 'Pets']);
});

test('nothing is grouped while the categories fit', () => {
  const categories = [['Casa', 100], ['Lazer', 50]];
  const compact = compactDonutCategories(categories);

  assert.deepEqual(compact, [['Casa', 100], ['Lazer', 50]]);
  assert.ok(compact.every(([, , grouped]) => grouped === undefined));
});

test('categories with no spending are dropped', () => {
  const compact = compactDonutCategories([['Casa', 100], ['Lazer', 0]]);
  assert.deepEqual(compact, [['Casa', 100]]);
});
