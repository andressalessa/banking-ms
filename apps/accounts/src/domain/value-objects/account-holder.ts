import { ValueObject } from '@core/entities/value-object';
import { InvalidHolderNameError } from '../errors/invalid-holder-name-error';
import type { Cpf } from './cpf';
import { Email } from './email';

export interface AccountHolderProps {
  fullName: string;
  cpf: Cpf;
  email: Email;
}

const MIN_NAME_LENGTH = 3;

export class AccountHolder extends ValueObject<AccountHolderProps> {
  get fullName() {
    return this.props.fullName;
  }

  get cpf() {
    return this.props.cpf;
  }

  get email() {
    return this.props.email;
  }

  private constructor(props: AccountHolderProps) {
    super(props);
  }

  static create(props: AccountHolderProps) {
    const fullName = typeof props.fullName === 'string' ? props.fullName.trim() : '';

    if (!fullName) {
      throw new InvalidHolderNameError();
    }

    if (fullName.length < MIN_NAME_LENGTH) {
      throw new InvalidHolderNameError(
        `Holder name must have at least ${MIN_NAME_LENGTH} characters.`,
      );
    }

    return new AccountHolder({ ...props, fullName });
  }
}
