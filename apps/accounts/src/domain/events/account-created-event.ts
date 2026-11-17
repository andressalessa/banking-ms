import { BaseDomainEvent } from '@core/events/base-domain-event';

export interface AccountCreatedPayload {
  accountId: string;
  holderName: string;
  // Dado sensível: necessário para o replay. Fica só no event store de `accounts`;
  // nunca propagar em eventos de integração nem em logs (ADR 0002, item 5).
  holderCpf: string;
  initialBalance: number;
}

export class AccountCreatedEvent extends BaseDomainEvent {
  public readonly eventType = 'AccountCreated';
  public readonly payload: Readonly<AccountCreatedPayload>;

  constructor(payload: AccountCreatedPayload, version: number) {
    super(payload.accountId, version);
    this.payload = Object.freeze({ ...payload });
  }
}
