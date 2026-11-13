import { AggregateRoot } from '@core/entities/aggregate-root';
import type { UniqueEntityID } from '@core/entities/unique-entity-id';
import type { Optional } from '@core/types/optional';
import { AccountCreated } from '../events/account-created';
import type { AccountHolder } from '../value-objects/account-holder';
import { Money } from '../value-objects/money';
import { AccountStatus } from '../enums/account-status';

export interface AccountProps {
  holder: AccountHolder;
  balance: Money;
  status: AccountStatus;
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

  get status() {
    return this.props.status;
  }

  get createdAt() {
    return this.props.createdAt;
  }

  get updatedAt() {
    return this.props.updatedAt;
  }

  static create(
    props: Optional<AccountProps, 'balance' | 'status' | 'createdAt' | 'updatedAt'>,
    id?: UniqueEntityID,
  ) {
    const account = new Account(
      {
        ...props,
        balance: props.balance ?? Money.zero(),
        status: props.status ?? AccountStatus.ACTIVE,
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
