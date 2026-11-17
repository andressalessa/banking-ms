import { DomainError } from '@core';

export class InvalidAmountError extends DomainError {
  constructor(message = 'Monetary amount must be a non-negative integer (cents).') {
    super(message);
  }
}
