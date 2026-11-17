import { ValueObject } from '@core/entities/value-object';
import { InvalidAmountError } from '../errors/invalid-amount-error';
import { InsufficientFundsError } from '../errors/insufficient-funds-error';

export interface MoneyProps {
  amount: number;
}

export class Money extends ValueObject<MoneyProps> {
  get amount() {
    return this.props.amount;
  }

  private constructor(props: MoneyProps) {
    super(props);
  }

  static zero() {
    return new Money({ amount: 0 });
  }

  /**
   * Creates a new Money instance from an amount in cents.
   * @param amount value in cents.
   * @throws InvalidAmountError if the amount is not a safe integer or is negative.
   * @returns a new Money instance.
   */
  static create(amount: number) {
    if (!Number.isSafeInteger(amount) || amount < 0) {
      throw new InvalidAmountError();
    }

    return new Money({ amount });
  }

  add(other: Money): Money {
    return Money.create(this.amount + other.amount);
  }

  subtract(other: Money): Money {
    if (this.isLessThan(other)) {
      throw new InsufficientFundsError();
    }

    return Money.create(this.amount - other.amount);
  }

  isLessThan(other: Money): boolean {
    return this.amount < other.amount;
  }

  isZero(): boolean {
    return this.amount === 0;
  }
}
