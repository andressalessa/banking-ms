export interface DomainEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  version: number;
  occurredAt: Date;
}
