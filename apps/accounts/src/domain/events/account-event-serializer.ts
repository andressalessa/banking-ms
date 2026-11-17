import type { DomainEvent } from '@core/events/domain-event';
import { AccountActivatedEvent, type AccountActivatedPayload } from './account-activated-event';
import { AccountBlockedEvent, type AccountBlockedPayload } from './account-blocked-event';
import { AccountCreatedEvent, type AccountCreatedPayload } from './account-created-event';
import { BalanceCreditedEvent, type BalanceCreditedPayload } from './balance-credited-event';
import { BalanceDebitedEvent, type BalanceDebitedPayload } from './balance-debited-event';

export const ACCOUNT_AGGREGATE_TYPE = 'Account';
const CURRENT_SCHEMA_VERSION = 1;

/** Formato persistido no event store (linha de `account_events`). */
export interface StoredAccountEvent {
  eventId: string;
  aggregateId: string;
  aggregateType: string;
  version: number;
  eventType: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
  metadata: { schemaVersion: number };
}

type Deserializer = (stored: StoredAccountEvent) => DomainEvent;

const restored = (s: StoredAccountEvent) => ({ eventId: s.eventId, occurredAt: s.occurredAt });

// Registro eventType -> deserializador. Novo evento = nova entrada aqui;
// mudança de payload = tratar `metadata.schemaVersion` (upcasting) na entrada correspondente.
const deserializers: Record<string, Deserializer> = {
  AccountCreated: (s) =>
    new AccountCreatedEvent(s.payload as unknown as AccountCreatedPayload, s.version, restored(s)),
  BalanceCredited: (s) =>
    new BalanceCreditedEvent(s.payload as unknown as BalanceCreditedPayload, s.version, restored(s)),
  BalanceDebited: (s) =>
    new BalanceDebitedEvent(s.payload as unknown as BalanceDebitedPayload, s.version, restored(s)),
  AccountBlocked: (s) =>
    new AccountBlockedEvent(s.payload as unknown as AccountBlockedPayload, s.version, restored(s)),
  AccountActivated: (s) =>
    new AccountActivatedEvent(
      s.payload as unknown as AccountActivatedPayload,
      s.version,
      restored(s),
    ),
};

export function serializeAccountEvent(event: DomainEvent): StoredAccountEvent {
  const { payload } = event as DomainEvent & { payload: Record<string, unknown> };

  return {
    eventId: event.eventId,
    aggregateId: event.aggregateId,
    aggregateType: ACCOUNT_AGGREGATE_TYPE,
    version: event.version,
    eventType: event.eventType,
    payload: { ...payload },
    occurredAt: event.occurredAt,
    metadata: { schemaVersion: CURRENT_SCHEMA_VERSION },
  };
}

export function deserializeAccountEvent(stored: StoredAccountEvent): DomainEvent {
  const deserialize = deserializers[stored.eventType];

  if (!deserialize) {
    throw new Error(`Unknown account event type: ${stored.eventType}`);
  }

  return deserialize(stored);
}
