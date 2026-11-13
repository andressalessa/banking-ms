import { ValueObject } from '@core/entities/value-object';

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

  static create(amount: number) {
    return new Money({ amount });
  }
}
