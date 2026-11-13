import { ValueObject } from '@core/entities/value-object';
import type { Cpf } from './cpf';
import { Email } from './email';

export interface AccountHolderProps {
  fullName: string;
  cpf: Cpf;
  email: Email;
}

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
    return new AccountHolder(props);
  }
}
