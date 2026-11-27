import { Injectable } from '@nestjs/common';
import { DomainEvents } from '@core/events/domain-events';
import { Account } from '@accounts/domain/entities/account';
import {
  deserializeAccountEvent,
  serializeAccountEvent,
} from '@accounts/domain/events/account-event-serializer';
import { AccountEventStore } from '@accounts/domain/repositories/account-event-store';
import { AccountsRepository } from '@accounts/domain/repositories/accounts-repository';

/** Repositório event-sourced: carrega por replay e salva por append. */
@Injectable()
export class EventStoreAccountsRepository extends AccountsRepository {
  constructor(private readonly eventStore: AccountEventStore) {
    super();
  }

  async findById(id: string): Promise<Account | null> {
    const stored = await this.eventStore.load(id);

    if (stored.length === 0) return null;

    return Account.fromHistory(stored.map(deserializeAccountEvent));
  }

  async findByCpf(cpf: string): Promise<Account | null> {
    const accountId = await this.eventStore.findAggregateIdByCpf(cpf);

    return accountId ? this.findById(accountId) : null;
  }

  async save(account: Account): Promise<void> {
    const pending = account.domainEvents;

    if (pending.length === 0) return;

    // versão que o agregado tinha quando foi carregado/criado
    const expectedVersion = account.version - pending.length;

    try {
      await this.eventStore.append(
        account.id.toString(),
        pending.map(serializeAccountEvent),
        expectedVersion,
      );
    } catch (error) {
      DomainEvents.discardEventsForAggregate(account.id);
      throw error;
    }

    await DomainEvents.dispatchEventsForAggregate(account.id);
  }
}
