import { AggregateRoot } from '@core/entities/aggregate-root';
import { UniqueEntityID } from '@core/entities/unique-entity-id';
import { TransactionStatus } from '../enums/transaction-status';
import { TransactionType } from '../enums/transaction-type';
import { InvalidTransactionStatusTransitionError } from '../errors/invalid-transaction-status-transition-error';
import { IdempotencyKey } from '../value-objects/idempotency-key';
import { Money } from '../value-objects/money';
import { TransactionId } from '../value-objects/transaction-id';

export interface TransactionProps {
  accountId: string;
  type: TransactionType;
  amount: Money;
  status: TransactionStatus;
  idempotencyKey: IdempotencyKey;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface CreateTransactionProps {
  id?: TransactionId;
  accountId: string;
  type: TransactionType;
  amount: Money;
  idempotencyKey: IdempotencyKey;
  createdAt?: Date;
}

/**
 * Registro de um débito/crédito. Nasce `PENDING` e segue o ciclo:
 * PENDING -> COMPLETED | FAILED; COMPLETED -> COMPENSATED (compensação da saga).
 * O estado é persistido diretamente (não é event-sourced; ver ADR de ownership).
 */
export class Transaction extends AggregateRoot<TransactionProps> {
  private static readonly allowedTransitions: Record<TransactionStatus, TransactionStatus[]> = {
    [TransactionStatus.PENDING]: [TransactionStatus.COMPLETED, TransactionStatus.FAILED],
    [TransactionStatus.COMPLETED]: [TransactionStatus.COMPENSATED],
    [TransactionStatus.FAILED]: [],
    [TransactionStatus.COMPENSATED]: [],
  };

  get transactionId() {
    return TransactionId.create(this.id.toString());
  }

  get accountId() {
    return this.props.accountId;
  }

  get type() {
    return this.props.type;
  }

  get amount() {
    return this.props.amount;
  }

  get status() {
    return this.props.status;
  }

  get idempotencyKey() {
    return this.props.idempotencyKey;
  }

  get createdAt() {
    return this.props.createdAt;
  }

  get updatedAt() {
    return this.props.updatedAt;
  }

  static create(props: CreateTransactionProps) {
    const id = props.id ?? TransactionId.generate();

    return new Transaction(
      {
        accountId: props.accountId,
        type: props.type,
        amount: props.amount,
        status: TransactionStatus.PENDING,
        idempotencyKey: props.idempotencyKey,
        createdAt: props.createdAt ?? new Date(),
        updatedAt: null,
      },
      new UniqueEntityID(id.value),
    );
  }

  /** Reconstitui uma transação já persistida (sem validações de criação). */
  static restore(props: TransactionProps, id: TransactionId) {
    return new Transaction(props, new UniqueEntityID(id.value));
  }

  complete() {
    this.transitionTo(TransactionStatus.COMPLETED);
  }

  fail() {
    this.transitionTo(TransactionStatus.FAILED);
  }

  compensate() {
    this.transitionTo(TransactionStatus.COMPENSATED);
  }

  private transitionTo(next: TransactionStatus) {
    if (!Transaction.allowedTransitions[this.props.status].includes(next)) {
      throw new InvalidTransactionStatusTransitionError(this.props.status, next);
    }

    this.props.status = next;
    this.props.updatedAt = new Date();
  }
}
