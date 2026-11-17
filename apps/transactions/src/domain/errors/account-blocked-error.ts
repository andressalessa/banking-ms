import { DomainError } from '@core';

/** Erro de integração: o serviço de contas recusou a operação porque a conta não está ativa. */
export class AccountBlockedError extends DomainError {
  constructor() {
    super('Account is not active.');
  }
}
