import { BaseDomainEvent, type RestoredEventMeta } from '@core/events/base-domain-event';

export interface AccountActivatedPayload {
  accountId: string;
}

export class AccountActivatedEvent extends BaseDomainEvent {
  public readonly eventType = 'AccountActivated';
  public readonly payload: Readonly<AccountActivatedPayload>;

  constructor(payload: AccountActivatedPayload, version: number, restored?: RestoredEventMeta) {
    super(payload.accountId, version, restored);
    this.payload = Object.freeze({ ...payload });
  }
}
