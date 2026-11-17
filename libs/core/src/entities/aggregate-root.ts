import type { DomainEvent } from '../events/domain-event';
import { DomainEvents } from '../events/domain-events';
import { Entity } from './entity';

export abstract class AggregateRoot<Props> extends Entity<Props> {
  private _domainEvents: DomainEvent[] = [];

  get domainEvents(): DomainEvent[] {
    return this._domainEvents;
  }

  private _version = 0;

  // quantos eventos o agregado já emitiu (0 = nenhum)
  get version(): number {
    return this._version;
  }

  // versão que o próximo evento deve ter; quem cria o evento passa este valor
  protected nextVersion(): number {
    return this._version + 1;
  }

  // anota que o evento existe (não faz o disparo ainda)
  protected addDomainEvent(domainEvent: DomainEvent): void {
    this._version = domainEvent.version;
    this._domainEvents.push(domainEvent);
    DomainEvents.markAggregateForDispatch(this);
  }

  public clearEvents() {
    this._domainEvents = [];
  }
}
