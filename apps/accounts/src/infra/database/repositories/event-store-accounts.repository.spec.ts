import { beforeEach, describe, expect, it } from 'vitest';
import { Account } from '@accounts/domain/entities/account';
import { ConcurrencyError } from '@accounts/domain/errors/concurrency-error';
import { CpfAlreadyRegisteredError } from '@accounts/domain/errors/cpf-already-registered-error';
import { AccountHolder } from '@accounts/domain/value-objects/account-holder';
import { Cpf } from '@accounts/domain/value-objects/cpf';
import { Email } from '@accounts/domain/value-objects/email';
import { Money } from '@accounts/domain/value-objects/money';
import { DomainEvents } from '@core/events/domain-events';
import { InMemoryAccountEventStore } from '../../../test/repositories/in-memory-account-event-store';
import { EventStoreAccountsRepository } from './event-store-accounts.repository';

const makeAccount = (cpf = '52998224725') =>
  Account.create({
    holder: AccountHolder.create({
      fullName: 'Maria Silva',
      cpf: Cpf.create(cpf),
      email: Email.create('maria@example.com'),
    }),
  });

let store: InMemoryAccountEventStore;
let repo: EventStoreAccountsRepository;

beforeEach(() => {
  DomainEvents.clearHandlers();
  DomainEvents.clearMarkedAggregates();
  store = new InMemoryAccountEventStore();
  repo = new EventStoreAccountsRepository(store);
});

describe('EventStoreAccountsRepository', () => {
  it('persiste só eventos e reconstrói a conta por replay', async () => {
    const account = makeAccount();
    account.credit(Money.create(1500));
    await repo.save(account);

    const loaded = await repo.findById(account.id.toString());

    expect(store.events.map((e) => e.eventType)).toEqual(['AccountCreated', 'BalanceCredited']);
    expect(loaded?.balance.amount).toBe(1500);
    expect(loaded?.version).toBe(2);
  });

  it('salva mutações seguintes anexando eventos (ordem por versão)', async () => {
    const account = makeAccount();
    await repo.save(account);

    const loaded = (await repo.findById(account.id.toString()))!;
    loaded.credit(Money.create(1000));
    loaded.debit(Money.create(300));
    await repo.save(loaded);

    expect(store.events.map((e) => e.version)).toEqual([1, 2, 3]);
    expect((await repo.findById(account.id.toString()))?.balance.amount).toBe(700);
  });

  it('busca por CPF e retorna null quando não existe', async () => {
    const account = makeAccount();
    await repo.save(account);

    expect((await repo.findByCpf('52998224725'))?.id.equals(account.id)).toBe(true);
    expect(await repo.findByCpf('11144477735')).toBeNull();
    expect(await repo.findById('inexistente')).toBeNull();
  });

  it('rejeita CPF duplicado', async () => {
    await repo.save(makeAccount());

    await expect(repo.save(makeAccount())).rejects.toBeInstanceOf(CpfAlreadyRegisteredError);
  });

  it('controle otimista: dois escritores com a mesma versão -> ConcurrencyError', async () => {
    const account = makeAccount();
    await repo.save(account);
    const id = account.id.toString();

    const a = (await repo.findById(id))!;
    const b = (await repo.findById(id))!;
    a.credit(Money.create(100));
    b.credit(Money.create(200));

    await repo.save(a);
    await expect(repo.save(b)).rejects.toBeInstanceOf(ConcurrencyError);
    expect((await repo.findById(id))?.balance.amount).toBe(100);
  });

  it('despacha os eventos de domínio após persistir', async () => {
    const received: string[] = [];
    DomainEvents.register((e) => void received.push(e.eventType), 'AccountCreated');

    await repo.save(makeAccount());

    expect(received).toEqual(['AccountCreated']);
  });
});
