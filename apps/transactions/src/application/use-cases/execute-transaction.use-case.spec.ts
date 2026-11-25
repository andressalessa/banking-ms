import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Transaction } from '@transactions/domain/entities/transaction';
import { TransactionStatus } from '@transactions/domain/enums/transaction-status';
import { TransactionType } from '@transactions/domain/enums/transaction-type';
import { IdempotencyKeyReusedWithDifferentPayloadError } from '@transactions/domain/errors/idempotency-key-reused-with-different-payload-error';
import { InsufficientFundsError } from '@transactions/domain/errors/insufficient-funds-error';
import { TransactionsRepository } from '@transactions/domain/repositories/transactions-repository';
import { Money } from '@transactions/domain/value-objects/money';
import { AccountsGateway } from '../gateways/accounts-gateway';
import { ExecuteTransactionUseCase } from './execute-transaction.use-case';

class InMemoryTransactionsRepository extends TransactionsRepository {
  items: Transaction[] = [];

  async findById(id: string) {
    return this.items.find((t) => t.id.toString() === id) ?? null;
  }
  async findByIdempotencyKey(key: string) {
    return this.items.find((t) => t.idempotencyKey.value === key) ?? null;
  }
  async save(transaction: Transaction) {
    this.items.push(transaction);
  }
  async listByAccount() {
    return this.items;
  }
}

describe('ExecuteTransactionUseCase', () => {
  let repository: InMemoryTransactionsRepository;
  let gateway: AccountsGateway;
  let useCase: ExecuteTransactionUseCase;

  const input = {
    accountId: 'acc-1',
    type: TransactionType.DEBIT,
    amount: Money.create(100),
    idempotencyKey: 'key-1',
  };

  beforeEach(() => {
    repository = new InMemoryTransactionsRepository();
    gateway = {
      getBalance: vi.fn(),
      credit: vi.fn().mockResolvedValue(1100),
      debit: vi.fn().mockResolvedValue(900),
    };
    useCase = new ExecuteTransactionUseCase(repository, gateway);
  });

  test('debits the account and stores a completed transaction', async () => {
    const transaction = await useCase.execute(input);

    expect(gateway.debit).toHaveBeenCalledWith('acc-1', input.amount);
    expect(transaction.status).toBe(TransactionStatus.COMPLETED);
    expect(repository.items).toHaveLength(1);
  });

  test('credits the account for credit transactions', async () => {
    await useCase.execute({ ...input, type: TransactionType.CREDIT });

    expect(gateway.credit).toHaveBeenCalledWith('acc-1', input.amount);
    expect(gateway.debit).not.toHaveBeenCalled();
  });

  test('repeating the same request returns the original transaction without calling accounts', async () => {
    const first = await useCase.execute(input);
    const second = await useCase.execute(input);

    expect(second).toBe(first);
    expect(gateway.debit).toHaveBeenCalledTimes(1);
    expect(repository.items).toHaveLength(1);
  });

  test('reusing the key with a different payload is rejected', async () => {
    await useCase.execute(input);

    await expect(useCase.execute({ ...input, amount: Money.create(200) })).rejects.toBeInstanceOf(
      IdempotencyKeyReusedWithDifferentPayloadError,
    );
  });

  test('gateway failures propagate and nothing is stored', async () => {
    vi.mocked(gateway.debit).mockRejectedValue(new InsufficientFundsError());

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(InsufficientFundsError);
    expect(repository.items).toHaveLength(0);
  });
});
