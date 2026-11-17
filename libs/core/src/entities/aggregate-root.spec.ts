import { BaseDomainEvent } from '../events/base-domain-event';
import { AggregateRoot } from './aggregate-root';

class SomethingHappened extends BaseDomainEvent {
  public readonly eventType = 'SomethingHappened';

  constructor(aggregate: CounterAggregate, version: number) {
    super(aggregate.id.toString(), version);
  }
}

class CounterAggregate extends AggregateRoot<null> {
  static create() {
    return new CounterAggregate(null);
  }

  doSomething() {
    this.addDomainEvent(new SomethingHappened(this, this.nextVersion()));
  }
}

describe('AggregateRoot versioning', () => {
  it('starts at version 0', () => {
    expect(CounterAggregate.create().version).toBe(0);
  });

  it('numbers events sequentially and advances the aggregate version', () => {
    const aggregate = CounterAggregate.create();

    aggregate.doSomething();
    aggregate.doSomething();

    expect(aggregate.domainEvents.map((e) => e.version)).toEqual([1, 2]);
    expect(aggregate.version).toBe(2);
  });

  it('keeps the version after clearing events', () => {
    const aggregate = CounterAggregate.create();

    aggregate.doSomething();
    aggregate.clearEvents();
    aggregate.doSomething();

    expect(aggregate.domainEvents[0].version).toBe(2);
  });

  it('generates a unique eventId and the declared eventType', () => {
    const aggregate = CounterAggregate.create();

    aggregate.doSomething();
    aggregate.doSomething();

    const [first, second] = aggregate.domainEvents;
    expect(first.eventId).not.toBe(second.eventId);
    expect(first.eventType).toBe('SomethingHappened');
  });
});
