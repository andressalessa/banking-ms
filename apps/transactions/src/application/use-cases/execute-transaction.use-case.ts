import { Transaction } from '@transactions/domain/entities/transaction';
import { TransactionType } from '@transactions/domain/enums/transaction-type';
import { IdempotencyKeyReusedWithDifferentPayloadError } from '@transactions/domain/errors/idempotency-key-reused-with-different-payload-error';
import { TransactionsRepository } from '@transactions/domain/repositories/transactions-repository';
import { IdempotencyKey } from '@transactions/domain/value-objects/idempotency-key';
import { Money } from '@transactions/domain/value-objects/money';
import { AccountsGateway } from '../gateways/accounts-gateway';

export interface ExecuteTransactionInput {
  accountId: string;
  type: TransactionType;
  amount: Money;
  idempotencyKey: string;
}

export class ExecuteTransactionUseCase {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly accountsGateway: AccountsGateway,
  ) {}

  /**
   * Idempotente: repetir a mesma chave com o mesmo payload devolve a transação original;
   * com payload diferente, é um erro do cliente.
   */
  async execute(input: ExecuteTransactionInput): Promise<Transaction> {
    const { accountId, type, amount } = input;
    const idempotencyKey = IdempotencyKey.create(input.idempotencyKey);

    const existingTransaction =
      await this.transactionsRepository.findByIdempotencyKey(
        idempotencyKey.value,
      );

    if (existingTransaction) {
      const samePayload =
        existingTransaction.accountId === accountId &&
        existingTransaction.type === type &&
        existingTransaction.amount.equals(amount);

      if (!samePayload) {
        throw new IdempotencyKeyReusedWithDifferentPayloadError();
      }
      return existingTransaction;
    }

    const transaction = Transaction.create({
      accountId,
      type,
      amount,
      idempotencyKey,
    });

    if (type === TransactionType.CREDIT) {
      await this.accountsGateway.credit(accountId, amount);
    } else {
      await this.accountsGateway.debit(accountId, amount);
    }

    transaction.complete();
    await this.transactionsRepository.save(transaction);

    return transaction;
  }
}
