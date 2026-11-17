import { ValueObject } from '@core/entities/value-object';
import { InvalidIdempotencyKeyError } from '../errors/invalid-idempotency-key-error';

export interface IdempotencyKeyProps {
  value: string;
}

const MAX_LENGTH = 255;

export class IdempotencyKey extends ValueObject<IdempotencyKeyProps> {
  get value() {
    return this.props.value;
  }

  private constructor(props: IdempotencyKeyProps) {
    super(props);
  }

  /** @throws InvalidIdempotencyKeyError se vazia (após trim) ou maior que 255 caracteres. */
  static create(value: string) {
    const trimmed = typeof value === 'string' ? value.trim() : '';

    if (trimmed.length === 0 || trimmed.length > MAX_LENGTH) {
      throw new InvalidIdempotencyKeyError();
    }

    return new IdempotencyKey({ value: trimmed });
  }

  toString() {
    return this.value;
  }
}
