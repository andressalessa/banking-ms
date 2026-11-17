import { DomainError } from '@core';

export class TransactionNotFoundError extends DomainError {
  constructor() {
    super('Transaction not found.');
  }
}
