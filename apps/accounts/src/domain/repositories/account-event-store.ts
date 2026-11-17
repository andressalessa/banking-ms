import type { StoredAccountEvent } from '../events/account-event-serializer';

/**
 * Event store do agregado `Account` (append-only).
 * Implementações: Postgres (infra) e in-memory (testes).
 */
export abstract class AccountEventStore {
  /**
   * Anexa eventos de forma atômica.
   * @param expectedVersion versão do agregado que o chamador leu (0 = agregado novo).
   * @throws ConcurrencyError se a versão atual divergir de `expectedVersion`.
   * @throws CpfAlreadyRegisteredError se o evento de criação trouxer um CPF já registrado.
   */
  abstract append(
    aggregateId: string,
    events: StoredAccountEvent[],
    expectedVersion: number,
  ): Promise<void>;

  /** Eventos do agregado com `version > fromVersion`, em ordem crescente. */
  abstract load(aggregateId: string, fromVersion?: number): Promise<StoredAccountEvent[]>;

  /** Id da conta dona do CPF, se existir. */
  abstract findAggregateIdByCpf(cpf: string): Promise<string | null>;
}
