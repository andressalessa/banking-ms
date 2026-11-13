import { DomainError } from '@core';

export class InsufficientFundsError extends DomainError {
  constructor() {
    super('Insufficient funds for this operation.');
  }
}
