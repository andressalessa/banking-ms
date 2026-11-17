import { DomainError } from '@core';

export class InvalidTransactionStatusTransitionError extends DomainError {
  constructor(from: string, to: string) {
    super(`Cannot change transaction status from ${from} to ${to}.`);
  }
}
