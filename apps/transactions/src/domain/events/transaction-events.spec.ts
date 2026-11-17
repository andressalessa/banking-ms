import { describe, expect, test } from 'vitest';
import { TransactionType } from '../enums/transaction-type';
import { Transaction } from '../entities/transaction';
import { IdempotencyKey } from '../value-objects/idempotency-key';
import { Money } from '../value-objects/money';
import { CreditPerformedEvent } from './credit-performed-event';
import { DebitPerformedEvent } from './debit-performed-event';

function makeTransaction(type: TransactionType) {
  return Transaction.create({
    accountId: 'account-1',
    type,
    amount: Money.create(5000),
    idempotencyKey: IdempotencyKey.create('key-1'),
  });
}

describe('Transaction integration events', () => {
  test('no event is emitted on creation', () => {
    expect(makeTransaction(TransactionType.DEBIT).domainEvents).toHaveLength(0);
  });

  test('completing a DEBIT emits DebitPerformed', () => {
    const tx = makeTransaction(TransactionType.DEBIT);
    tx.complete();

    const [event] = tx.domainEvents;
    expect(tx.domainEvents).toHaveLength(1);
    expect(event).toBeInstanceOf(DebitPerformedEvent);
    expect(event.eventType).toBe('DebitPerformed');
    expect(event.aggregateId).toBe(tx.id.toString());
    expect(event.version).toBe(1);
    expect(event.eventId).toEqual(expect.any(String));
    expect(event.occurredAt).toBeInstanceOf(Date);
    expect((event as DebitPerformedEvent).payload).toEqual({
      transactionId: tx.id.toString(),
      accountId: 'account-1',
      amount: 5000,
    });
  });

  test('completing a CREDIT emits CreditPerformed', () => {
    const tx = makeTransaction(TransactionType.CREDIT);
    tx.complete();

    const [event] = tx.domainEvents;
    expect(event).toBeInstanceOf(CreditPerformedEvent);
    expect(event.eventType).toBe('CreditPerformed');
    expect((event as CreditPerformedEvent).payload.amount).toBe(5000);
  });

  test('fail and compensate do not emit integration events', () => {
    const failed = makeTransaction(TransactionType.DEBIT);
    failed.fail();
    expect(failed.domainEvents).toHaveLength(0);

    const compensated = makeTransaction(TransactionType.DEBIT);
    compensated.complete();
    compensated.clearEvents();
    compensated.compensate();
    expect(compensated.domainEvents).toHaveLength(0);
  });

  test('an invalid transition emits nothing', () => {
    const tx = makeTransaction(TransactionType.DEBIT);
    tx.fail();
    expect(() => tx.complete()).toThrow();
    expect(tx.domainEvents).toHaveLength(0);
  });

  test('event ids are unique and payload is immutable', () => {
    const a = makeTransaction(TransactionType.DEBIT);
    const b = makeTransaction(TransactionType.DEBIT);
    a.complete();
    b.complete();

    expect(a.domainEvents[0].eventId).not.toBe(b.domainEvents[0].eventId);
    expect(Object.isFrozen((a.domainEvents[0] as DebitPerformedEvent).payload)).toBe(true);
  });
});
