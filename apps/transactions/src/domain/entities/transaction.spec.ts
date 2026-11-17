import { describe, expect, test } from 'vitest';
import { TransactionStatus } from '../enums/transaction-status';
import { TransactionType } from '../enums/transaction-type';
import { InvalidTransactionStatusTransitionError } from '../errors/invalid-transaction-status-transition-error';
import { IdempotencyKey } from '../value-objects/idempotency-key';
import { Money } from '../value-objects/money';
import { TransactionId } from '../value-objects/transaction-id';
import { Transaction } from './transaction';

function makeTransaction(type = TransactionType.DEBIT) {
  return Transaction.create({
    accountId: 'account-1',
    type,
    amount: Money.create(5000),
    idempotencyKey: IdempotencyKey.create('key-1'),
  });
}

describe('Transaction', () => {
  test('is created as PENDING with generated id', () => {
    const tx = makeTransaction();

    expect(tx.status).toBe(TransactionStatus.PENDING);
    expect(tx.type).toBe(TransactionType.DEBIT);
    expect(tx.amount.amount).toBe(5000);
    expect(tx.accountId).toBe('account-1');
    expect(tx.idempotencyKey.value).toBe('key-1');
    expect(tx.createdAt).toBeInstanceOf(Date);
    expect(tx.updatedAt).toBeNull();
    expect(tx.transactionId.value).toBe(tx.id.toString());
  });

  test('uses the given id and createdAt', () => {
    const id = TransactionId.generate();
    const createdAt = new Date('2026-01-01T00:00:00Z');
    const tx = Transaction.create({
      id,
      createdAt,
      accountId: 'a',
      type: TransactionType.CREDIT,
      amount: Money.create(1),
      idempotencyKey: IdempotencyKey.create('k'),
    });

    expect(tx.id.toString()).toBe(id.value);
    expect(tx.createdAt).toBe(createdAt);
  });

  test('PENDING -> COMPLETED updates updatedAt', () => {
    const tx = makeTransaction();
    tx.complete();

    expect(tx.status).toBe(TransactionStatus.COMPLETED);
    expect(tx.updatedAt).toBeInstanceOf(Date);
  });

  test('PENDING -> FAILED', () => {
    const tx = makeTransaction();
    tx.fail();

    expect(tx.status).toBe(TransactionStatus.FAILED);
  });

  test('COMPLETED -> COMPENSATED', () => {
    const tx = makeTransaction();
    tx.complete();
    tx.compensate();

    expect(tx.status).toBe(TransactionStatus.COMPENSATED);
  });

  test.each([
    ['compensate a PENDING', (t: Transaction) => t.compensate()],
    ['complete twice', (t: Transaction) => (t.complete(), t.complete())],
    ['fail a COMPLETED', (t: Transaction) => (t.complete(), t.fail())],
    ['complete a FAILED', (t: Transaction) => (t.fail(), t.complete())],
    ['compensate twice', (t: Transaction) => (t.complete(), t.compensate(), t.compensate())],
  ])('rejects invalid transition: %s', (_name, act) => {
    expect(() => act(makeTransaction())).toThrow(InvalidTransactionStatusTransitionError);
  });

  test('restore keeps persisted state', () => {
    const tx = makeTransaction(TransactionType.CREDIT);
    tx.complete();

    const restored = Transaction.restore(
      {
        accountId: tx.accountId,
        type: tx.type,
        amount: tx.amount,
        status: tx.status,
        idempotencyKey: tx.idempotencyKey,
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt,
      },
      tx.transactionId,
    );

    expect(restored.status).toBe(TransactionStatus.COMPLETED);
    expect(restored.id.equals(tx.id)).toBe(true);
  });
});
