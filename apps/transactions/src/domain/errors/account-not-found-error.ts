import { DomainError } from '@core';

/** Erro de integração: o serviço de contas informou que a conta não existe. */
export class AccountNotFoundError extends DomainError {
  constructor() {
    super('Account not found.');
  }
}
