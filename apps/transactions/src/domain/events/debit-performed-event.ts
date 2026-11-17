import { BaseDomainEvent, type RestoredEventMeta } from '@core/events/base-domain-event';

export interface DebitPerformedPayload {
  transactionId: string;
  accountId: string;
  /** valor em centavos */
  amount: number;
}

/** Evento de integração: o débito foi confirmado por `accounts`. */
export class DebitPerformedEvent extends BaseDomainEvent {
  public readonly eventType = 'DebitPerformed';
  public readonly payload: Readonly<DebitPerformedPayload>;

  constructor(payload: DebitPerformedPayload, version: number, restored?: RestoredEventMeta) {
    super(payload.transactionId, version, restored);
    this.payload = Object.freeze({ ...payload });
  }
}
