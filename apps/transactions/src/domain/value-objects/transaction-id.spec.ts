import { describe, expect, test } from 'vitest';
import { InvalidTransactionIdError } from '../errors/invalid-transaction-id-error';
import { TransactionId } from './transaction-id';

describe('TransactionId', () => {
  test('generates a valid unique id', () => {
    const a = TransactionId.generate();
    const b = TransactionId.generate();

    expect(TransactionId.create(a.value).equals(a)).toBe(true);
    expect(a.equals(b)).toBe(false);
  });

  test('rejects non-UUID values', () => {
    expect(() => TransactionId.create('abc')).toThrow(InvalidTransactionIdError);
  });
});
