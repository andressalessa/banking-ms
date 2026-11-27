import { Injectable } from '@nestjs/common';
import type { Transaction } from '@transactions/domain/entities/transaction';
import { TransactionsRepository } from '@transactions/domain/repositories/transactions-repository';
import { PrismaTransactionMapper } from '../mappers/prisma-transaction.mapper.js';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class PrismaTransactionsRepository extends TransactionsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string): Promise<Transaction | null> {
    const row = await this.prisma.transaction.findUnique({ where: { id } });

    return row ? PrismaTransactionMapper.toDomain(row) : null;
  }

  async findByIdempotencyKey(key: string): Promise<Transaction | null> {
    const row = await this.prisma.transaction.findUnique({ where: { idempotencyKey: key } });

    return row ? PrismaTransactionMapper.toDomain(row) : null;
  }

  /** Grava estado e outbox na mesma transação; os eventos só são limpos após o commit. */
  async save(transaction: Transaction): Promise<void> {
    const data = PrismaTransactionMapper.toPersistence(transaction);
    const events = transaction.domainEvents;

    await this.prisma.$transaction(async (tx) => {
      await tx.transaction.upsert({ where: { id: data.id }, create: data, update: data });

      if (events.length > 0) {
        await tx.outboxEvent.createMany({
          data: events.map((event) => PrismaTransactionMapper.toOutboxEvent(event)),
        });
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

    return rows.map((row) => PrismaTransactionMapper.toDomain(row));
  }
}
