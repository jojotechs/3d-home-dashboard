import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRmb, formatRmb} from '../src/finance/money.mjs';

test('a balance preserves exact RMB cents, including amounts above floating-point precision', () => {
  assert.equal(parseRmb('1234.56'), '123456');
  assert.equal(parseRmb('90071992547409.93'), '9007199254740993');
  assert.equal(formatRmb('9007199254740993'), '90,071,992,547,409.93');
  assert.equal(parseRmb('0.01'), '1');
  for (const value of ['', '-1', '1.001', '1e3', 'NaN', '12,000']) {
    assert.throws(() => parseRmb(value));
  }
});
