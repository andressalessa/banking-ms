import { DomainEvent } from '@core/events/domain-event';
import { UniqueEntityID } from '@core/entities/unique-entity-id';

export interface AccountCreatedPayload {
  accountId: string;
  holderName: string;
  holderCpf: string;
  initialBalance: number;
}

export class AccountCreatedEvent implements DomainEvent {
  public readonly occurredAt: Date;
  public readonly payload: AccountCreatedPayload;

  constructor(payload: AccountCreatedPayload) {
    this.occurredAt = new Date();
    this.payload = payload;
  }

  getAggregateId(): UniqueEntityID {
    return new UniqueEntityID(this.payload.accountId);
  }
}
