import { describe, expect, test } from 'vitest';
import { UniqueEntityID } from '@core/entities/unique-entity-id';
import { AccountStatus } from '../enums/account-status';
import { AccountBlockedError } from '../errors/account-blocked-error';
import { InsufficientFundsError } from '../errors/insufficient-funds-error';
import { InvalidAmountError } from '../errors/invalid-amount-error';
import { AccountCreatedEvent } from '../events/account-created-event';
import { BalanceCreditedEvent } from '../events/balance-credited-event';
import { BalanceDebitedEvent } from '../events/balance-debited-event';
import { AccountHolder } from '../value-objects/account-holder';
import { Cpf } from '../value-objects/cpf';
import { Email } from '../value-objects/email';
import { Money } from '../value-objects/money';
import { Account } from './account';

function makeHolder() {
  return AccountHolder.create({
    fullName: 'Ada Lovelace',
    cpf: Cpf.create('52998224725'),
    email: Email.create('ada@lovelace.com'),
  });
}

test('create an account with holder, zero balance and timestamps', () => {
  const holder = makeHolder();

  const account = Account.create({ holder });

  expect(account.holder).toEqual(holder);
  expect(account.balance.amount).toBe(0);
  expect(account.createdAt).toBeInstanceOf(Date);
  expect(account.updatedAt).toBeNull();
  expect(account.domainEvents).toHaveLength(1);
  expect(account.domainEvents[0]).toBeInstanceOf(AccountCreatedEvent);
});

test('keep an informed balance when creating an account', () => {
  const account = Account.create({
    holder: makeHolder(),
    balance: Money.create(1500),
  });

  expect(account.balance.amount).toBe(1500);
});

describe('Account behavior', () => {
  function makeAccount(balance = 1000) {
    const account = Account.create({ holder: makeHolder(), balance: Money.create(balance) });
    account.clearEvents();
    return account;
  }

  test('credit increases balance, updates updatedAt and emits event', () => {
    const account = makeAccount();

    account.credit(Money.create(500));

    expect(account.balance.amount).toBe(1500);
    expect(account.updatedAt).toBeInstanceOf(Date);
    expect(account.domainEvents).toHaveLength(1);
    expect(account.domainEvents[0]).toBeInstanceOf(BalanceCreditedEvent);
  });

  test('debit decreases balance, updates updatedAt and emits event', () => {
    const account = makeAccount();

    account.debit(Money.create(400));

    expect(account.balance.amount).toBe(600);
    expect(account.updatedAt).toBeInstanceOf(Date);
    expect(account.domainEvents[0]).toBeInstanceOf(BalanceDebitedEvent);
  });

  test('debit with insufficient funds throws and keeps state', () => {
    const account = makeAccount(100);

    expect(() => account.debit(Money.create(101))).toThrow(InsufficientFundsError);
    expect(account.balance.amount).toBe(100);
    expect(account.domainEvents).toHaveLength(0);
    expect(account.updatedAt).toBeNull();
  });

  test('rejects zero amount on credit and debit', () => {
    const account = makeAccount();

    expect(() => account.credit(Money.zero())).toThrow(InvalidAmountError);
    expect(() => account.debit(Money.zero())).toThrow(InvalidAmountError);
  });

  test('block changes status and updatedAt', () => {
    const account = makeAccount();

    account.block();

    expect(account.status).toBe(AccountStatus.BLOCKED);
    expect(account.updatedAt).toBeInstanceOf(Date);
  });

  test('blocked account cannot credit or debit', () => {
    const account = makeAccount();
    account.block();

    expect(() => account.credit(Money.create(10))).toThrow(AccountBlockedError);
    expect(() => account.debit(Money.create(10))).toThrow(AccountBlockedError);
    expect(account.balance.amount).toBe(1000);
  });

  test('activate re-enables transactions', () => {
    const account = makeAccount();
    account.block();

    account.activate();
    account.credit(Money.create(10));

    expect(account.status).toBe(AccountStatus.ACTIVE);
    expect(account.balance.amount).toBe(1010);
  });

  test('block and activate are idempotent', () => {
    const account = makeAccount();

    account.activate();
    expect(account.updatedAt).toBeNull();

    account.block();
    const updatedAt = account.updatedAt;
    account.block();
    expect(account.updatedAt).toBe(updatedAt);
  });
});

describe('Account events', () => {
  test('each operation emits the expected event with sequential versions', () => {
    const account = Account.create({ holder: makeHolder(), balance: Money.create(1000) });

    account.credit(Money.create(500));
    account.debit(Money.create(200));

    const events = account.domainEvents;
    expect(events.map((e) => e.eventType)).toEqual([
      'AccountCreated',
      'BalanceCredited',
      'BalanceDebited',
    ]);
    expect(events.map((e) => e.version)).toEqual([1, 2, 3]);
    expect(events.every((e) => e.aggregateId === account.id.toString())).toBe(true);
    expect(new Set(events.map((e) => e.eventId)).size).toBe(3);
    expect(events.every((e) => e.occurredAt instanceof Date)).toBe(true);
  });

  test('event payload is immutable', () => {
    const account = Account.create({ holder: makeHolder() });
    account.credit(Money.create(100));
    const event = account.domainEvents[1] as BalanceCreditedEvent;

    expect(() => {
      (event.payload as { amount: number }).amount = 999;
    }).toThrow(TypeError);
    expect(event.payload.amount).toBe(100);
  });
});

test('does not dispatch a creation event when reconstituting an account', () => {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');

  const account = Account.create(
    {
      holder: makeHolder(),
      balance: Money.create(1500),
      createdAt,
      updatedAt: null,
    },
    new UniqueEntityID('account-1'),
  );

  expect(account.id.toValue()).toBe('account-1');
  expect(account.createdAt).toEqual(createdAt);
  expect(account.domainEvents).toHaveLength(0);
});
