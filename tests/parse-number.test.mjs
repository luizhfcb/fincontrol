import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePtBrNumber } from '../src/core/parse-number.mjs';

test('parses pt-BR formatted numbers with thousands and comma decimal', () => {
  assert.equal(parsePtBrNumber('5.000,00'), 5000);
  assert.equal(parsePtBrNumber('1.234.567,89'), 1234567.89);
  assert.equal(parsePtBrNumber('5000,5'), 5000.5);
  assert.equal(parsePtBrNumber('0,99'), 0.99);
  assert.equal(parsePtBrNumber(',75'), 0.75);
  assert.equal(parsePtBrNumber('R$ 2.450,30'), 2450.3);
});

test('parses dot-decimal and plain integer strings and finite numbers', () => {
  assert.equal(parsePtBrNumber('123.45'), 123.45);
  assert.equal(parsePtBrNumber('.5'), 0.5);
  assert.equal(parsePtBrNumber('42'), 42);
  assert.equal(parsePtBrNumber('1.000.000'), 1000000);
  assert.equal(parsePtBrNumber('  -150,25  '), -150.25);
  assert.equal(parsePtBrNumber(99.5), 99.5);
  assert.equal(parsePtBrNumber(0), 0);
});

test('returns NaN for invalid inputs', () => {
  for (const bad of ['', '   ', null, undefined, NaN, Infinity, -Infinity, 'abc', '12abc', '12,34,56', '1.2.3', '12.34,56', '123,', '123.', ',', '.', '--5', {}]) {
    assert.ok(Number.isNaN(parsePtBrNumber(bad)), `Expected NaN for ${String(bad)}`);
  }
});
