import type { Account } from '@accounts/domain/entities/account';
import { AccountsRepository } from '@accounts/domain/repositories/accounts-repository';
import { DomainEvents } from '@core/events/domain-events';

export class InMemoryAccountsRepository extends AccountsRepository {
  public items: Account[] = [];

  async findById(id: string): Promise<Account | null> {
    return this.items.find((item) => item.id.toString() === id) ?? null;
  }

  async findByCpf(cpf: string): Promise<Account | null> {
    return this.items.find((item) => item.holder.cpf.value === cpf) ?? null;
  }

  async save(account: Account): Promise<void> {
    const index = this.items.findIndex((item) => item.id.equals(account.id));

    if (index >= 0) {
      this.items[index] = account;
    } else {
      this.items.push(account);
    }

    await DomainEvents.dispatchEventsForAggregate(account.id);
  }
}
