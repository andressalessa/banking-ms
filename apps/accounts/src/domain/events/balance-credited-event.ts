import { BaseDomainEvent, type RestoredEventMeta } from '@core/events/base-domain-event';

export interface BalanceCreditedPayload {
  accountId: string;
  amount: number;
}

export class BalanceCreditedEvent extends BaseDomainEvent {
  public readonly eventType = 'BalanceCredited';
  public readonly payload: Readonly<BalanceCreditedPayload>;

  constructor(payload: BalanceCreditedPayload, version: number, restored?: RestoredEventMeta) {
    super(payload.accountId, version, restored);
    this.payload = Object.freeze({ ...payload });
  }
}
