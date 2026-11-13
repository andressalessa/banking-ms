import { DomainError } from '@core';

export class InvalidEmailError extends DomainError {
  constructor(message: string = 'Invalid email.') {
    super(message);
  }
}
