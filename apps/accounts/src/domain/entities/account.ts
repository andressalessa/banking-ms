import { AggregateRoot } from '@core/entities/aggregate-root';
import type { UniqueEntityID } from '@core/entities/unique-entity-id';
import type { Optional } from '@core/types/optional';
import { AccountCreated } from '../events/account-created';
import type { AccountHolder } from '../value-objects/account-holder';
import { Money } from '../value-objects/money';

export interface AccountProps {
  holder: AccountHolder;
  balance: Money;
  createdAt: Date;
  updatedAt: Date | null;
}

export class Account extends AggregateRoot<AccountProps> {
  get holder() {
    return this.props.holder;
  }

  get balance() {
    return this.props.balance;
  }

  get createdAt() {
    return this.props.createdAt;
  }

  get updatedAt() {
    return this.props.updatedAt;
  }

  static create(
    props: Optional<AccountProps, 'balance' | 'createdAt' | 'updatedAt'>,
    id?: UniqueEntityID,
  ) {
    const account = new Account(
      {
        ...props,
        balance: props.balance ?? Money.zero(),
        createdAt: props.createdAt ?? new Date(),
        updatedAt: props.updatedAt ?? null,
      },
      id,
    );

    const isNewAccount = !id;

    if (isNewAccount) {
      account.addDomainEvent(new AccountCreated(account));
    }

    return account;
  }
}
