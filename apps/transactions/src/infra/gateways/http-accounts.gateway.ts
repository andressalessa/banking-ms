import { AccountsGateway } from '../../application/gateways/accounts-gateway';
import { AccountBlockedError } from '../../domain/errors/account-blocked-error';
import { AccountNotFoundError } from '../../domain/errors/account-not-found-error';
import { AccountsRequestRejectedError } from '../../domain/errors/accounts-request-rejected-error';
import { AccountsServiceUnavailableError } from '../../domain/errors/accounts-service-unavailable-error';
import { InsufficientFundsError } from '../../domain/errors/insufficient-funds-error';
import type { Money } from '../../domain/value-objects/money';
import type {
  AccountsBalanceResponse,
  AccountsChangeBalanceResponse,
  AccountsErrorResponse,
} from './accounts-api.types';

export interface HttpAccountsGatewayOptions {
  baseUrl: string;
  timeoutMs: number;
}

/**
 * Adapter HTTP da porta `AccountsGateway`: traduz chamadas de domínio em REST
 * para o serviço `accounts` e os erros HTTP dele em exceções de domínio de `transactions`
 * (anti-corruption: o formato de erro de `accounts` não vaza para dentro).
 */
export class HttpAccountsGateway extends AccountsGateway {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: HttpAccountsGatewayOptions) {
    super();
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs;
  }

  async getBalance(accountId: string): Promise<number> {
    const { balance } = await this.request<AccountsBalanceResponse>(
      'GET',
      `/accounts/${accountId}/balance`,
    );
    return balance;
  }

  credit(accountId: string, amount: Money): Promise<number> {
    return this.changeBalance(accountId, 'credit', amount);
  }

  debit(accountId: string, amount: Money): Promise<number> {
    return this.changeBalance(accountId, 'debit', amount);
  }

  private async changeBalance(
    accountId: string,
    operation: 'credit' | 'debit',
    amount: Money,
  ) {
    const { balance } = await this.request<AccountsChangeBalanceResponse>(
      'POST',
      `/internal/accounts/${accountId}/${operation}`,
      { amount: amount.amount },
    );
    return balance;
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers:
          body === undefined
            ? undefined
            : { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      // Timeout, conexão recusada, DNS...
      throw new AccountsServiceUnavailableError();
    }

    if (response.ok) {
      return (await response.json()) as T;
    }
    throw await this.toDomainError(response);
  }

  private async toDomainError(response: Response): Promise<Error> {
    if (response.status >= 500) return new AccountsServiceUnavailableError();

    const error = (await response.json().catch(() => undefined)) as
      Partial<AccountsErrorResponse> | undefined;
    const code = error?.code ?? 'UNKNOWN';

    if (response.status === 404 && code === 'ACCOUNT_NOT_FOUND')
      return new AccountNotFoundError();
    if (code === 'INSUFFICIENT_FUNDS') return new InsufficientFundsError();
    if (code === 'ACCOUNT_BLOCKED') return new AccountBlockedError();
    return new AccountsRequestRejectedError(
      code,
      error?.message ?? `HTTP ${response.status}`,
    );
  }
}
