import { ConcurrencyError } from '@accounts/domain/errors/concurrency-error';
import { CpfAlreadyRegisteredError } from '@accounts/domain/errors/cpf-already-registered-error';
import type { StoredAccountEvent } from '@accounts/domain/events/account-event-serializer';
import { AccountEventStore } from '@accounts/domain/repositories/account-event-store';

export class InMemoryAccountEventStore extends AccountEventStore {
  public events: StoredAccountEvent[] = [];
  private cpfRegistry = new Map<string, string>();

  async append(aggregateId: string, events: StoredAccountEvent[], expectedVersion: number) {
    const current = this.events.filter((e) => e.aggregateId === aggregateId);
    const currentVersion = current.at(-1)?.version ?? 0;

    if (currentVersion !== expectedVersion) throw new ConcurrencyError();

    const created = events.find((e) => e.eventType === 'AccountCreated');
    if (created) {
      const cpf = String(created.payload.holderCpf);
      if (this.cpfRegistry.has(cpf)) throw new CpfAlreadyRegisteredError();
      this.cpfRegistry.set(cpf, aggregateId);
    }

    this.events.push(...events);
  }

  async load(aggregateId: string, fromVersion = 0) {
    return this.events.filter((e) => e.aggregateId === aggregateId && e.version > fromVersion);
  }

  async findAggregateIdByCpf(cpf: string) {
    return this.cpfRegistry.get(cpf) ?? null;
  }
}
