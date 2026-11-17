import { BaseDomainEvent, type RestoredEventMeta } from '@core/events/base-domain-event';

export interface AccountCreatedPayload {
  accountId: string;
  holderName: string;
  // Dados pessoais: necessários para o replay. Ficam só no event store de `accounts`;
  // nunca propagar em eventos de integração nem em logs (ADR 0002, item 5).
  holderCpf: string;
  holderEmail: string;
  initialBalance: number;
}

export class AccountCreatedEvent extends BaseDomainEvent {
  public readonly eventType = 'AccountCreated';
  public readonly payload: Readonly<AccountCreatedPayload>;

  constructor(payload: AccountCreatedPayload, version: number, restored?: RestoredEventMeta) {
    super(payload.accountId, version, restored);
    this.payload = Object.freeze({ ...payload });
  }
}
