import { BaseDomainEvent, type RestoredEventMeta } from '@core/events/base-domain-event';

export interface AccountBlockedPayload {
  accountId: string;
}

export class AccountBlockedEvent extends BaseDomainEvent {
  public readonly eventType = 'AccountBlocked';
  public readonly payload: Readonly<AccountBlockedPayload>;

  constructor(payload: AccountBlockedPayload, version: number, restored?: RestoredEventMeta) {
    super(payload.accountId, version, restored);
    this.payload = Object.freeze({ ...payload });
  }
}
