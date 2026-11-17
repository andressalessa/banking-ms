import { DomainError } from '@core';

export class CpfAlreadyRegisteredError extends DomainError {
  constructor() {
    super('CPF is already registered.');
  }
}
