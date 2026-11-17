import { DomainError } from '@core';

export class InvalidIdempotencyKeyError extends DomainError {
  constructor() {
    super('Idempotency key must be a non-empty string of at most 255 characters.');
  }
}
