import { DomainError } from '@core';

/** Erro de integração: o serviço de contas rejeitou a requisição por um motivo sem erro dedicado aqui. */
export class AccountsRequestRejectedError extends DomainError {
  constructor(
    readonly accountsCode: string,
    message: string,
  ) {
    super(`Accounts service rejected the request: ${message}`);
  }
}
