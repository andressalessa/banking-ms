import { AggregateRoot } from '@core/entities/aggregate-root';
import { UniqueEntityID } from '@core/entities/unique-entity-id';
import type { DomainEvent } from '@core/events/domain-event';
import { AccountActivatedEvent } from '../events/account-activated-event';
import { AccountBlockedEvent } from '../events/account-blocked-event';
import { AccountCreatedEvent } from '../events/account-created-event';
import { BalanceCreditedEvent } from '../events/balance-credited-event';
import { BalanceDebitedEvent } from '../events/balance-debited-event';
import { AccountBlockedError } from '../errors/account-blocked-error';
import { InsufficientFundsError } from '../errors/insufficient-funds-error';
import { InvalidAmountError } from '../errors/invalid-amount-error';
import { AccountHolder } from '../value-objects/account-holder';
import { Cpf } from '../value-objects/cpf';
import { Email } from '../value-objects/email';
import { Money } from '../value-objects/money';
import { AccountStatus } from '../enums/account-status';

export interface AccountProps {
  holder: AccountHolder;
  balance: Money;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface CreateAccountProps {
  holder: AccountHolder;
  balance?: Money;
}

/**
 * Agregado event-sourced: o estado é derivado exclusivamente dos eventos.
 * Toda mutação passa por `raise` (aplica o evento e o registra como pendente);
 * a reconstrução (`fromHistory`) reaplica os eventos pelo mesmo `apply`.
 */
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

  static create(props: CreateAccountProps) {
    const account = new Account({} as AccountProps, new UniqueEntityID());

    account.raise(
      new AccountCreatedEvent(
        {
          accountId: account.id.toString(),
          holderName: props.holder.fullName,
          holderCpf: props.holder.cpf.value,
          holderEmail: props.holder.email.value,
          initialBalance: (props.balance ?? Money.zero()).amount,
        },
        account.nextVersion(),
      ),
    );

    return account;
  }

  /**
   * Reconstrói a conta a partir do histórico (ordenado por versão).
   * Não gera eventos pendentes.
   */
  static fromHistory(events: DomainEvent[]) {
    const [first] = events;

    if (!(first instanceof AccountCreatedEvent)) {
      throw new Error('Account history must start with an AccountCreated event.');
    }

    const account = new Account({} as AccountProps, new UniqueEntityID(first.aggregateId));

    for (const event of events) {
      account.apply(event);
      account.restoreVersion(event.version);
    }

    return account;
  }

  credit(amount: Money) {
    this.ensureCanOperate(amount);

    this.raise(
      new BalanceCreditedEvent(
        { accountId: this.id.toString(), amount: amount.amount },
        this.nextVersion(),
      ),
    );
  }

  debit(amount: Money) {
    this.ensureCanOperate(amount);

    if (this.props.balance.isLessThan(amount)) {
      throw new InsufficientFundsError();
    }

    this.raise(
      new BalanceDebitedEvent(
        { accountId: this.id.toString(), amount: amount.amount },
        this.nextVersion(),
      ),
    );
  }

  block() {
    if (this.props.status === AccountStatus.BLOCKED) return;

    this.raise(new AccountBlockedEvent({ accountId: this.id.toString() }, this.nextVersion()));
  }

  activate() {
    if (this.props.status === AccountStatus.ACTIVE) return;

    this.raise(new AccountActivatedEvent({ accountId: this.id.toString() }, this.nextVersion()));
  }

  private raise(event: DomainEvent) {
    this.apply(event);
    this.addDomainEvent(event);
  }

  // Única porta de mudança de estado (usada na mutação e no replay).
  private apply(event: DomainEvent) {
    if (event instanceof AccountCreatedEvent) {
      const { holderName, holderCpf, holderEmail, initialBalance } = event.payload;

      this.props = {
        holder: AccountHolder.create({
          fullName: holderName,
          cpf: Cpf.create(holderCpf),
          email: Email.create(holderEmail),
        }),
        balance: Money.create(initialBalance),
        status: AccountStatus.ACTIVE,
        createdAt: event.occurredAt,
        updatedAt: null,
      };
      return;
    }

    if (event instanceof BalanceCreditedEvent) {
      this.props.balance = this.props.balance.add(Money.create(event.payload.amount));
    } else if (event instanceof BalanceDebitedEvent) {
      this.props.balance = this.props.balance.subtract(Money.create(event.payload.amount));
    } else if (event instanceof AccountBlockedEvent) {
      this.props.status = AccountStatus.BLOCKED;
    } else if (event instanceof AccountActivatedEvent) {
      this.props.status = AccountStatus.ACTIVE;
    } else {
      throw new Error(`Unknown account event: ${event.eventType}`);
    }

    this.props.updatedAt = event.occurredAt;
  }

  private ensureCanOperate(amount: Money): void {
    if (this.props.status !== AccountStatus.ACTIVE) {
      throw new AccountBlockedError();
    }

    if (amount.isZero()) {
      throw new InvalidAmountError('Amount must be greater than zero.');
    }
  }
}
