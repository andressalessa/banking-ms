import { BaseDomainEvent, type RestoredEventMeta } from '@core/events/base-domain-event';

export interface CreditPerformedPayload {
  transactionId: string;
  accountId: string;
  /** valor em centavos */
  amount: number;
}

/** Evento de integração: o crédito foi confirmado por `accounts`. */
export class CreditPerformedEvent extends BaseDomainEvent {
  public readonly eventType = 'CreditPerformed';
  public readonly payload: Readonly<CreditPerformedPayload>;

  constructor(payload: CreditPerformedPayload, version: number, restored?: RestoredEventMeta) {
    super(payload.transactionId, version, restored);
    this.payload = Object.freeze({ ...payload });
  }
}
