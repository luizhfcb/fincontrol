import test from 'node:test';
import assert from 'node:assert/strict';

import { parseBrazilianAmount, parseVoiceInput } from '../js/core/utils.js';

test('parseBrazilianAmount respeita ponto=milhar e vírgula=decimal', () => {
  assert.equal(parseBrazilianAmount('1.500,50'), 1500.5);
  assert.equal(parseBrazilianAmount('50,00'), 50);
  assert.equal(parseBrazilianAmount('1.500'), 1500);
  assert.equal(parseBrazilianAmount('2.000'), 2000);
  assert.equal(parseBrazilianAmount('25'), 25);
  assert.equal(parseBrazilianAmount('0,99'), 0.99);
});

test('parseBrazilianAmount devolve 0 para entrada inválida', () => {
  assert.equal(parseBrazilianAmount(''), 0);
  assert.equal(parseBrazilianAmount(undefined), 0);
  assert.equal(parseBrazilianAmount('abc'), 0);
});

test('parseVoiceInput lê valor em formato de moeda pt-BR (regressão do bug 1.500,50 -> 1.5)', () => {
  const r = parseVoiceInput('r$ 1.500,50 salário');
  assert.equal(r.value, 1500.5);
  assert.equal(r.category, 'Trabalho');
  assert.equal(r.description, 'Salário');
});

test('parseVoiceInput lê números digitados simples', () => {
  assert.equal(parseVoiceInput('almoço 25').value, 25);
  assert.equal(parseVoiceInput('recebi 3000 freelance').value, 3000);
});

test('parseVoiceInput lê números por extenso quando não há dígitos', () => {
  assert.equal(parseVoiceInput('uber trinta').value, 30);
  assert.equal(parseVoiceInput('mil e quinhentos de aluguel').value, 1500);
  assert.equal(parseVoiceInput('cem reais farmácia').value, 100);
  assert.equal(parseVoiceInput('duzentos e cinquenta netflix').value, 250);
});

test('parseVoiceInput classifica categorias por palavra-chave', () => {
  assert.equal(parseVoiceInput('almoço 25').category, 'Alimentação');
  assert.equal(parseVoiceInput('uber trinta').category, 'Transporte');
  assert.equal(parseVoiceInput('farmácia 40').category, 'Saúde');
  assert.equal(parseVoiceInput('netflix 30').category, 'Lazer');
  assert.equal(parseVoiceInput('aluguel 1200').category, 'Casa');
  assert.equal(parseVoiceInput('salário 5000').category, 'Trabalho');
  assert.equal(parseVoiceInput('algo aleatório 10').category, 'Outros');
});

test('parseVoiceInput sem valor retorna 0 e usa o texto como descrição', () => {
  const r = parseVoiceInput('pizza');
  assert.equal(r.value, 0);
  assert.equal(r.description, 'Pizza');
});

test('parseVoiceInput capitaliza a primeira letra da descrição', () => {
  assert.equal(parseVoiceInput('mercado 80').description[0], 'M');
});
