import { AggregateRoot } from '../entities/aggregate-root';
import { BaseDomainEvent } from './base-domain-event';
import type { DomainEvent } from './domain-event';
import { DomainEvents } from './domain-events';

class CustomAggregateCreated extends BaseDomainEvent {
  public readonly eventType = 'CustomAggregateCreated';
  public aggregate: CustomAggregate;

  constructor(aggregate: CustomAggregate, version: number) {
    super(aggregate.id.toString(), version);
    this.aggregate = aggregate;
  }
}

class CustomAggregate extends AggregateRoot<null> {
  static create() {
    const aggregate = new CustomAggregate(null);

    aggregate.addDomainEvent(
      new CustomAggregateCreated(aggregate, aggregate.nextVersion()),
    );

    return aggregate;
  }
}

describe('domain events', () => {
  it('should be able to dispatch and listen to events', async () => {
    const callbackSpy = vi.fn<(event: DomainEvent) => void>();

    DomainEvents.register(callbackSpy, 'CustomAggregateCreated');

    const aggregate = CustomAggregate.create();

    expect(aggregate.domainEvents).toHaveLength(1);

    await DomainEvents.dispatchEventsForAggregate(aggregate.id);

    expect(callbackSpy).toHaveBeenCalled();
    expect(aggregate.domainEvents).toHaveLength(0);
  });
});
