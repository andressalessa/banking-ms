/**
 * DTOs espelhados do contrato OpenAPI do serviço `accounts` (`/docs`).
 * Duplicados de propósito: `transactions` não importa código de `accounts`;
 * mudanças de contrato quebram os testes do gateway, não a compilação do outro serviço.
 */
export interface AccountsBalanceResponse {
  accountId: string;
  balance: number;
}

export interface AccountsChangeBalanceResponse {
  balance: number;
}

export interface AccountsErrorResponse {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
  path: string;
}
