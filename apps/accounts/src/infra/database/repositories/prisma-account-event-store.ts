import { Injectable } from '@nestjs/common';
import { ConcurrencyError } from '@accounts/domain/errors/concurrency-error';
import { CpfAlreadyRegisteredError } from '@accounts/domain/errors/cpf-already-registered-error';
import type { StoredAccountEvent } from '@accounts/domain/events/account-event-serializer';
import { AccountEventStore } from '@accounts/domain/repositories/account-event-store';
import { Prisma } from '../../../../prisma/generated/client.js';
import { PrismaAccountEventMapper } from '../mappers/prisma-account-event.mapper.js';
import { PrismaService } from '../prisma.service.js';

const UNIQUE_VIOLATION = 'P2002';

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION;
}

@Injectable()
export class PrismaAccountEventStore extends AccountEventStore {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async append(
    aggregateId: string,
    events: StoredAccountEvent[],
    expectedVersion: number,
  ): Promise<void> {
    if (events.length === 0) return;

    await this.prisma.$transaction(async (tx) => {
      const last = await tx.accountEvent.aggregate({
        where: { aggregateId },
        _max: { version: true },
      });

      if ((last._max.version ?? 0) !== expectedVersion) {
        throw new ConcurrencyError();
      }

      const created = events.find((event) => event.eventType === 'AccountCreated');

      if (created) {
        try {
          await tx.accountCpfRegistry.create({
            data: { cpf: String(created.payload.holderCpf), accountId: aggregateId },
          });
        } catch (error) {
          throw isUniqueViolation(error) ? new CpfAlreadyRegisteredError() : error;
        }
      }

      try {
        await tx.accountEvent.createMany({
          data: events.map((event) => PrismaAccountEventMapper.toPersistence(event)),
        });
      } catch (error) {
        // corrida: outro append gravou a mesma versão entre a leitura e a escrita
        throw isUniqueViolation(error) ? new ConcurrencyError() : error;
      }
    });
  }

  async load(aggregateId: string, fromVersion = 0): Promise<StoredAccountEvent[]> {
    const rows = await this.prisma.accountEvent.findMany({
      where: { aggregateId, version: { gt: fromVersion } },
      orderBy: { version: 'asc' },
    });

    return rows.map((row) => PrismaAccountEventMapper.toStored(row));
  }

  async findAggregateIdByCpf(cpf: string): Promise<string | null> {
    const row = await this.prisma.accountCpfRegistry.findUnique({ where: { cpf } });

    return row?.accountId ?? null;
  }
}
