import { UniqueEntityID } from '../entities/unique-entity-id';
import type { DomainEvent } from './domain-event';

/**
 * Envelope comum a todos os eventos (id, agregado, tipo, versão, data).
 * Não contém regra de negócio: o payload fica nas subclasses.
 */
export abstract class BaseDomainEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly aggregateId: string;
  public readonly occurredAt: Date;
  public readonly version: number;

  // Contrato gravado no event store: declarado à mão em cada evento
  // (não derivar de constructor.name, senão renomear a classe quebra o histórico).
  abstract readonly eventType: string;

  protected constructor(aggregateId: string, version: number) {
    // string (serializável), mas gerada pelo mesmo mecanismo dos ids de entidade
    this.eventId = new UniqueEntityID().toString();
    this.aggregateId = aggregateId;
    this.occurredAt = new Date();
    this.version = version;
  }
}
