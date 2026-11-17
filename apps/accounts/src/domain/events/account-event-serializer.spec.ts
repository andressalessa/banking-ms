import { cpf as cpfGenerator } from 'cpf-cnpj-validator';
import { Account } from '../entities/account';
import { AccountHolder } from '../value-objects/account-holder';
import { Cpf } from '../value-objects/cpf';
import { Email } from '../value-objects/email';
import { Money } from '../value-objects/money';
import { deserializeAccountEvent, serializeAccountEvent } from './account-event-serializer';

describe('account event serializer', () => {
  const makeAccount = () =>
    Account.create({
      holder: AccountHolder.create({
        fullName: 'Maria Silva',
        cpf: Cpf.create(cpfGenerator.generate()),
        email: Email.create('maria@example.com'),
      }),
    });

  it('faz round-trip de todos os tipos de evento preservando id, versão e data', () => {
    const account = makeAccount();
    account.credit(Money.create(1000));
    account.debit(Money.create(200));
    account.block();
    account.activate();

    const events = account.domainEvents;
    expect(events.map((e) => e.eventType)).toEqual([
      'AccountCreated',
      'BalanceCredited',
      'BalanceDebited',
      'AccountBlocked',
      'AccountActivated',
    ]);

    for (const event of events) {
      const stored = serializeAccountEvent(event);
      expect(stored).toMatchObject({ aggregateType: 'Account', metadata: { schemaVersion: 1 } });

      const restored = deserializeAccountEvent(stored);
      expect(restored.constructor).toBe(event.constructor);
      expect(restored.eventId).toBe(event.eventId);
      expect(restored.version).toBe(event.version);
      expect(restored.occurredAt).toEqual(event.occurredAt);
    }
  });

  it('rejeita tipo de evento desconhecido', () => {
    const stored = serializeAccountEvent(makeAccount().domainEvents[0]);
    expect(() => deserializeAccountEvent({ ...stored, eventType: 'Nope' })).toThrow(
      'Unknown account event type: Nope',
    );
  });
});
