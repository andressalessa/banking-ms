import type { DomainEvent } from '@core/events/domain-event';
import { Transaction } from '@transactions/domain/entities/transaction';
import { TransactionStatus } from '@transactions/domain/enums/transaction-status';
import { TransactionType } from '@transactions/domain/enums/transaction-type';
import { IdempotencyKey } from '@transactions/domain/value-objects/idempotency-key';
import { Money } from '@transactions/domain/value-objects/money';
import { TransactionId } from '@transactions/domain/value-objects/transaction-id';
import type { Prisma } from '../../../../prisma/generated/client.js';
import type { Transaction as TransactionRow } from '../../../../prisma/generated/client.js';

export class PrismaTransactionMapper {
  static toPersistence(transaction: Transaction) {
    return {
      id: transaction.id.toString(),
      accountId: transaction.accountId,
      type: transaction.type,
      amount: transaction.amount.amount,
      status: transaction.status,
      idempotencyKey: transaction.idempotencyKey.value,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }

  static toOutboxEvent(event: DomainEvent) {
    const { payload } = event as DomainEvent & { payload: Prisma.InputJsonObject };

    return {
      id: event.eventId,
      aggregateId: event.aggregateId,
      eventType: event.eventType,
      payload,
      occurredAt: event.occurredAt,
    };
  }

  static toDomain(row: TransactionRow) {
    return Transaction.restore(
      {
        accountId: row.accountId,
        type: row.type as TransactionType,
        amount: Money.create(row.amount),
        status: row.status as TransactionStatus,
        idempotencyKey: IdempotencyKey.create(row.idempotencyKey),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      TransactionId.create(row.id),
    );
  }
}
