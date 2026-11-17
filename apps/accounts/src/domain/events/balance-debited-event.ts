import { BaseDomainEvent } from '@core/events/base-domain-event';

export interface BalanceDebitedPayload {
  accountId: string;
  amount: number;
}

export class BalanceDebitedEvent extends BaseDomainEvent {
  public readonly eventType = 'BalanceDebited';
  public readonly payload: Readonly<BalanceDebitedPayload>;

  constructor(payload: BalanceDebitedPayload, version: number) {
    super(payload.accountId, version);
    this.payload = Object.freeze({ ...payload });
  }
}
