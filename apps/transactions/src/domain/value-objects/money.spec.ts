import { describe, expect, test } from 'vitest';
import { InvalidTransactionAmountError } from '../errors/invalid-transaction-amount-error';
import { Money } from './money';

describe('Money (transactions)', () => {
  test('creates from positive integer cents', () => {
    expect(Money.create(1050).amount).toBe(1050);
  });

  test.each([0, -1, 10.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects %s', (value) => {
    expect(() => Money.create(value)).toThrow(InvalidTransactionAmountError);
  });

  test('compares by value', () => {
    expect(Money.create(100).equals(Money.create(100))).toBe(true);
    expect(Money.create(100).equals(Money.create(200))).toBe(false);
  });
});
