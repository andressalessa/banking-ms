import { DomainError } from '@core';

export class InvalidAmountError extends DomainError {
  constructor() {
    super('Monetary amount cannot be negative.');
  }
}
