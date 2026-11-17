import { DomainError } from '@core';

/** Erro de integração: o serviço de contas recusou a operação por saldo insuficiente. */
export class InsufficientFundsError extends DomainError {
  constructor() {
    super('Insufficient funds.');
  }
}
