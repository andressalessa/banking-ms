import { DomainEvent } from '@core/events/domain-event';
import { UniqueEntityID } from '@core/entities/unique-entity-id';

export interface BalanceCreditedPayload {
  accountId: string;
  amount: number;
}

export class BalanceCreditedEvent implements DomainEvent {
  public readonly occurredAt: Date;
  public readonly payload: BalanceCreditedPayload;

  constructor(payload: BalanceCreditedPayload) {
    this.occurredAt = new Date();
    this.payload = payload;
  }

  getAggregateId(): UniqueEntityID {
    return new UniqueEntityID(this.payload.accountId);
  }
}
