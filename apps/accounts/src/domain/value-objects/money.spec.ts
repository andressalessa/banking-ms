import { describe, expect, test } from 'vitest';
import { InsufficientFundsError } from '../errors/insufficient-funds-error';
import { InvalidAmountError } from '../errors/invalid-amount-error';
import { Money } from './money';

describe('Money Value Object', () => {
  test('creates zero', () => {
    expect(Money.zero().amount).toBe(0);
  });

  test('creates from integer cents', () => {
    expect(Money.create(1050).amount).toBe(1050);
  });

  test('rejects negative amounts', () => {
    expect(() => Money.create(-1)).toThrow(InvalidAmountError);
  });

  test('rejects non-integer, NaN and Infinity', () => {
    expect(() => Money.create(10.5)).toThrow(InvalidAmountError);
    expect(() => Money.create(NaN)).toThrow(InvalidAmountError);
    expect(() => Money.create(Infinity)).toThrow(InvalidAmountError);
  });

  test('adds without floating point errors', () => {
    expect(Money.create(10).add(Money.create(20)).amount).toBe(30);
  });

  test('subtracts', () => {
    expect(Money.create(100).subtract(Money.create(40)).amount).toBe(60);
  });

  test('allows subtracting down to zero', () => {
    expect(Money.create(100).subtract(Money.create(100)).amount).toBe(0);
  });

  test('throws InsufficientFundsError when subtracting more than available', () => {
    expect(() => Money.create(50).subtract(Money.create(51))).toThrow(
      InsufficientFundsError,
    );
  });

  test('compares with isLessThan', () => {
    expect(Money.create(1).isLessThan(Money.create(2))).toBe(true);
    expect(Money.create(2).isLessThan(Money.create(2))).toBe(false);
  });

  test('compares with equals', () => {
    expect(Money.create(5).equals(Money.create(5))).toBe(true);
    expect(Money.create(5).equals(Money.create(6))).toBe(false);
  });

  test('is immutable on operations', () => {
    const a = Money.create(10);
    a.add(Money.create(5));
    expect(a.amount).toBe(10);
  });
});
