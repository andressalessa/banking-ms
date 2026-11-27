import type { StoredAccountEvent } from '@accounts/domain/events/account-event-serializer';
import type { AccountEvent as AccountEventRow, Prisma } from '../../../../prisma/generated/client.js';

export class PrismaAccountEventMapper {
  static toPersistence(event: StoredAccountEvent) {
    return {
      eventId: event.eventId,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      version: event.version,
      eventType: event.eventType,
      payload: event.payload as Prisma.InputJsonObject,
      occurredAt: event.occurredAt,
      metadata: event.metadata,
    };
  }

  static toStored(row: AccountEventRow): StoredAccountEvent {
    return {
      eventId: row.eventId,
      aggregateId: row.aggregateId,
      aggregateType: row.aggregateType,
      version: row.version,
      eventType: row.eventType,
      payload: row.payload as Record<string, unknown>,
      occurredAt: row.occurredAt,
      metadata: row.metadata as StoredAccountEvent['metadata'],
    };
  }
}
