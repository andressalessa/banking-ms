import { DomainError } from '@core';

export class InvalidTransactionAmountError extends DomainError {
  constructor(message = 'Transaction amount must be a positive integer (cents).') {
    super(message);
  }
}
