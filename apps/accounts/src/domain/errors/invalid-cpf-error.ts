import { DomainError } from '@core';

export class InvalidCpfError extends DomainError {
  constructor() {
    super('Invalid CPF.');
  }
}
