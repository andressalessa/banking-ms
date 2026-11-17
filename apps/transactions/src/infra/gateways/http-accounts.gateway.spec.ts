import { describe, expect, test, vi } from 'vitest';
import { AccountBlockedError } from '../../domain/errors/account-blocked-error';
import { AccountNotFoundError } from '../../domain/errors/account-not-found-error';
import { AccountsRequestRejectedError } from '../../domain/errors/accounts-request-rejected-error';
import { AccountsServiceUnavailableError } from '../../domain/errors/accounts-service-unavailable-error';
import { InsufficientFundsError } from '../../domain/errors/insufficient-funds-error';
import { Money } from '../../domain/value-objects/money';
import { HttpAccountsGateway } from './http-accounts.gateway';

const ID = '3f1c1a0e-7a54-4f0b-9a55-6a4f1c2d9e11';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function makeGateway(fetchFn: typeof fetch) {
  return new HttpAccountsGateway({ baseUrl: 'http://accounts:3001/', timeoutMs: 500, fetch: fetchFn });
}

describe('HttpAccountsGateway', () => {
  test('getBalance calls the balance endpoint', async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(200, { accountId: ID, balance: 1500 }));

    await expect(makeGateway(fetchFn).getBalance(ID)).resolves.toBe(1500);

    expect(fetchFn).toHaveBeenCalledWith(
      `http://accounts:3001/accounts/${ID}/balance`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  test.each(['credit', 'debit'] as const)('%s posts the amount in cents and returns the new balance', async (op) => {
    const fetchFn = vi.fn().mockResolvedValue(json(200, { balance: 900 }));

    await expect(makeGateway(fetchFn)[op](ID, Money.create(100))).resolves.toBe(900);

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`http://accounts:3001/internal/accounts/${ID}/${op}`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ amount: 100 });
  });

  test.each([
    [404, 'ACCOUNT_NOT_FOUND', AccountNotFoundError],
    [422, 'INSUFFICIENT_FUNDS', InsufficientFundsError],
    [422, 'ACCOUNT_BLOCKED', AccountBlockedError],
    [422, 'INVALID_AMOUNT', AccountsRequestRejectedError],
    [400, 'VALIDATION_ERROR', AccountsRequestRejectedError],
  ])('maps accounts error %i %s', async (status, code, expected) => {
    const fetchFn = vi.fn().mockResolvedValue(json(status, { code, message: 'x', timestamp: '', path: '' }));

    await expect(makeGateway(fetchFn).debit(ID, Money.create(1))).rejects.toBeInstanceOf(expected);
  });

  test('keeps the accounts error code on unmapped rejections', async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(409, { code: 'CONCURRENCY', message: 'conflict' }));

    await expect(makeGateway(fetchFn).credit(ID, Money.create(1))).rejects.toMatchObject({ accountsCode: 'CONCURRENCY' });
  });

  test('5xx responses become service unavailable', async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(503, { code: 'SERVICE_UNAVAILABLE' }));

    await expect(makeGateway(fetchFn).getBalance(ID)).rejects.toBeInstanceOf(AccountsServiceUnavailableError);
  });

  test('network failure becomes service unavailable', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError('fetch failed'));

    await expect(makeGateway(fetchFn).getBalance(ID)).rejects.toBeInstanceOf(AccountsServiceUnavailableError);
  });

  test('non-JSON error body is tolerated', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('<html>', { status: 400 }));

    await expect(makeGateway(fetchFn).getBalance(ID)).rejects.toBeInstanceOf(AccountsRequestRejectedError);
  });

  test('aborts and reports unavailable when accounts is too slow', async () => {
    const slow = ((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(init.signal?.reason));
      })) as unknown as typeof fetch;
    const gateway = new HttpAccountsGateway({ baseUrl: 'http://accounts', timeoutMs: 20, fetch: slow });

    await expect(gateway.getBalance(ID)).rejects.toBeInstanceOf(AccountsServiceUnavailableError);
  });
});
