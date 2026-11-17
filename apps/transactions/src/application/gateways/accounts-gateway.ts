import type { Money } from '../../domain/value-objects/money';

/**
 * Porta de saída: tudo o que `transactions` precisa saber/pedir ao serviço de contas.
 * O domínio e os casos de uso dependem só deste contrato; o transporte (HTTP) é detalhe de `infra/`.
 * Valores em centavos; falhas viram exceções de domínio (`AccountNotFoundError`,
 * `InsufficientFundsError`, `AccountBlockedError`, `AccountsServiceUnavailableError`, ...).
 */
export abstract class AccountsGateway {
  /** @returns saldo atual da conta, em centavos. */
  abstract getBalance(accountId: string): Promise<number>;

  /** @returns saldo da conta após o crédito, em centavos. */
  abstract credit(accountId: string, amount: Money): Promise<number>;

  /** @returns saldo da conta após o débito, em centavos. */
  abstract debit(accountId: string, amount: Money): Promise<number>;
}
