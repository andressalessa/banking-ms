import { DomainEvent } from '@core/events/domain-event';
import { UniqueEntityID } from '@core/entities/unique-entity-id';

export interface BalanceDebitedPayload {
  accountId: string;
  amount: number;
}

export class BalanceDebitedEvent implements DomainEvent {
  public readonly occurredAt: Date;
  public readonly payload: BalanceDebitedPayload;

  constructor(payload: BalanceDebitedPayload) {
    this.occurredAt = new Date();
    this.payload = payload;
  }

  getAggregateId(): UniqueEntityID {
    return new UniqueEntityID(this.payload.accountId);
  }
}
