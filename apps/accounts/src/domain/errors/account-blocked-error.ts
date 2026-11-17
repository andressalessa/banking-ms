import { DomainError } from '@core';

export class AccountBlockedError extends DomainError {
  constructor() {
    super('Account is blocked and cannot perform transactions.');
  }
}
