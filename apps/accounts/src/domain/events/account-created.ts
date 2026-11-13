import type { UniqueEntityID } from '@core/entities/unique-entity-id';
import type { DomainEvent } from '@core/events/domain-event';
import type { Account } from '../entities/account';

export class AccountCreated implements DomainEvent {
  public ocurredAt: Date;
  private account: Account;

  constructor(account: Account) {
    this.account = account;
    this.ocurredAt = new Date();
  }

  getAggregateId(): UniqueEntityID {
    return this.account.id;
  }
}
