import { AggregateRoot } from '@core/entities/aggregate-root';
import type { UniqueEntityID } from '@core/entities/unique-entity-id';
import type { Optional } from '@core/types/optional';
import { AccountCreatedEvent } from '../events/account-created-event';
import { BalanceCreditedEvent } from '../events/balance-credited-event';
import { BalanceDebitedEvent } from '../events/balance-debited-event';
import { AccountBlockedError } from '../errors/account-blocked-error';
import { InvalidAmountError } from '../errors/invalid-amount-error';
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
      account.addDomainEvent(
        new AccountCreatedEvent(
          {
            accountId: account.id.toString(),
            holderName: account.holder.fullName,
            holderCpf: account.holder.cpf.value,
            initialBalance: account.balance.amount,
          },
          account.nextVersion(),
        ),
      );
    }

    return account;
  }

  credit(amount: Money) {
    this.ensureCanOperate(amount);

    this.props.balance = this.props.balance.add(amount);
    this.touch();
    this.addDomainEvent(
      new BalanceCreditedEvent(
        {
          accountId: this.id.toString(),
          amount: amount.amount,
        },
        this.nextVersion(),
      ),
    );
  }

  debit(amount: Money) {
    this.ensureCanOperate(amount);

    this.props.balance = this.props.balance.subtract(amount);
    this.touch();
    this.addDomainEvent(
      new BalanceDebitedEvent(
        {
          accountId: this.id.toString(),
          amount: amount.amount,
        },
        this.nextVersion(),
      ),
    );
  }

  block() {
    if (this.props.status === AccountStatus.BLOCKED) return;

    this.props.status = AccountStatus.BLOCKED;
    this.touch();
  }

  activate() {
    if (this.props.status === AccountStatus.ACTIVE) return;

    this.props.status = AccountStatus.ACTIVE;
    this.touch();
  }

  private ensureCanOperate(amount: Money): void {
    if (this.props.status !== AccountStatus.ACTIVE) {
      throw new AccountBlockedError();
    }

    if (amount.isZero()) {
      throw new InvalidAmountError('Amount must be greater than zero.');
    }
  }

  private touch() {
    this.props.updatedAt = new Date();
  }
}
