import { DomainError } from '@core';

export class InvalidHolderNameError extends DomainError {
  constructor(message = 'Holder name is required.') {
    super(message);
  }
}
