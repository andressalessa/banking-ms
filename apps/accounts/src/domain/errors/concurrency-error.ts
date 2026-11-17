import { DomainError } from '@core';

export class ConcurrencyError extends DomainError {
  constructor() {
    super('The account was modified by another operation. Please retry.');
  }
}
