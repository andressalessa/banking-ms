import { randomUUID } from 'node:crypto';
import { ValueObject } from '@core/entities/value-object';
import { InvalidTransactionIdError } from '../errors/invalid-transaction-id-error';

export interface TransactionIdProps {
  value: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class TransactionId extends ValueObject<TransactionIdProps> {
  get value() {
    return this.props.value;
  }

  private constructor(props: TransactionIdProps) {
    super(props);
  }

  static generate() {
    return new TransactionId({ value: randomUUID() });
  }

  /** @throws InvalidTransactionIdError se não for um UUID. */
  static create(value: string) {
    if (!UUID_REGEX.test(value)) {
      throw new InvalidTransactionIdError();
    }

    return new TransactionId({ value: value.toLowerCase() });
  }

  toString() {
    return this.value;
  }
}
