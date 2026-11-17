import { describe, expect, test } from 'vitest';
import { AccountNotFoundError } from './account-not-found-error';
import { TransactionNotFoundError } from './transaction-not-found-error';

describe('transactions domain errors', () => {
  test('expose stable codes', () => {
    expect(new TransactionNotFoundError().code).toBe('TRANSACTION_NOT_FOUND');
    expect(new AccountNotFoundError().code).toBe('ACCOUNT_NOT_FOUND');
  });
});
