import { DomainError } from '@core';

export class InvalidTransactionIdError extends DomainError {
  constructor() {
    super('Transaction id must be a valid UUID.');
  }
}
