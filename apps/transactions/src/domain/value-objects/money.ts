import { ValueObject } from '@core/entities/value-object';
import { InvalidTransactionAmountError } from '../errors/invalid-transaction-amount-error';

export interface MoneyProps {
  amount: number;
}

/**
 * Valor monetário do contexto de `transactions`, em centavos inteiros.
 * Duplicado de propósito (não importa de `accounts`): cada serviço evolui suas
 * próprias regras. Aqui só importa ser um valor positivo; aritmética de saldo
 * pertence a `accounts`.
 */
export class Money extends ValueObject<MoneyProps> {
  get amount() {
    return this.props.amount;
  }

  private constructor(props: MoneyProps) {
    super(props);
  }

  /**
   * @param amount valor em centavos.
   * @throws InvalidTransactionAmountError se não for inteiro seguro positivo.
   */
  static create(amount: number) {
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new InvalidTransactionAmountError();
    }

    return new Money({ amount });
  }
}
