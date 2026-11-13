import { UniqueEntityID } from '@core/entities/unique-entity-id';
import { AccountCreated } from '../events/account-created';
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
  expect(account.domainEvents[0]).toBeInstanceOf(AccountCreated);
});

test('keep an informed balance when creating an account', () => {
  const account = Account.create({
    holder: makeHolder(),
    balance: Money.create(1500),
  });

  expect(account.balance.amount).toBe(1500);
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
