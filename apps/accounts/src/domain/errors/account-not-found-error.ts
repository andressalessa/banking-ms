import { DomainError } from '@core';

export class AccountNotFoundError extends DomainError {
  constructor() {
    super('Account not found.');
  }
}
