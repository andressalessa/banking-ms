import { Transaction } from '../entities/transaction';

export abstract class TransactionsRepository {
  abstract findById(id: string): Promise<Transaction | null>;
  abstract findByIdempotencyKey(key: string): Promise<Transaction | null>;
  abstract save(transaction: Transaction): Promise<void>;
  abstract listByAccount(
    accountId: string,
    filter: { from?: Date; to?: Date },
  ): Promise<Transaction[]>;
}
