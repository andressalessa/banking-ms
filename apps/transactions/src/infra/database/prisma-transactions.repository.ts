import { Injectable } from '@nestjs/common';
import type { DomainEvent } from '@core/events/domain-event';
import { Transaction } from '@transactions/domain/entities/transaction';
import { TransactionStatus } from '@transactions/domain/enums/transaction-status';
import { TransactionType } from '@transactions/domain/enums/transaction-type';
import { TransactionsRepository } from '@transactions/domain/repositories/transactions-repository';
import { IdempotencyKey } from '@transactions/domain/value-objects/idempotency-key';
import { Money } from '@transactions/domain/value-objects/money';
import { TransactionId } from '@transactions/domain/value-objects/transaction-id';
import { Prisma } from '../../../prisma/generated/client.js';
import type { Transaction as TransactionRow } from '../../../prisma/generated/client.js';
import { PrismaService } from './prisma.service.js';

function toRow(transaction: Transaction) {
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

function toOutboxEventRow(event: DomainEvent) {
  const { payload } = event as DomainEvent & { payload: Prisma.InputJsonObject };

  return {
    id: event.eventId,
    aggregateId: event.aggregateId,
    eventType: event.eventType,
    payload,
    occurredAt: event.occurredAt,
  };
}

function toDomain(row: TransactionRow) {
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

@Injectable()
export class PrismaTransactionsRepository extends TransactionsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string): Promise<Transaction | null> {
    const row = await this.prisma.transaction.findUnique({ where: { id } });

    return row ? toDomain(row) : null;
  }

  async findByIdempotencyKey(key: string): Promise<Transaction | null> {
    const row = await this.prisma.transaction.findUnique({ where: { idempotencyKey: key } });

    return row ? toDomain(row) : null;
  }

  /** Grava estado e outbox na mesma transação; os eventos só são limpos após o commit. */
  async save(transaction: Transaction): Promise<void> {
    const data = toRow(transaction);
    const events = transaction.domainEvents;

    await this.prisma.$transaction(async (tx) => {
      await tx.transaction.upsert({ where: { id: data.id }, create: data, update: data });

      if (events.length > 0) {
        await tx.outboxEvent.createMany({ data: events.map(toOutboxEventRow) });
      }
    });

    transaction.clearEvents();
  }

  async listByAccount(
    accountId: string,
    filter: { from?: Date; to?: Date },
  ): Promise<Transaction[]> {
    const rows = await this.prisma.transaction.findMany({
      where: {
        accountId,
        createdAt: { gte: filter.from, lte: filter.to },
      },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map(toDomain);
  }
}
