import { DomainError } from '@core';

export class IdempotencyKeyReusedWithDifferentPayloadError extends DomainError {
  constructor() {
    super('Idempotency key was already used with a different payload.');
  }
}
