import { DomainError } from '@core';

/** Erro de integração: o serviço de contas não respondeu a tempo ou falhou (rede, timeout, 5xx). */
export class AccountsServiceUnavailableError extends DomainError {
  constructor() {
    super('Accounts service is unavailable.');
  }
}
