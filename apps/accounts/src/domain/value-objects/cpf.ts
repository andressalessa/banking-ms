import { cpf as cpfValidator } from 'cpf-cnpj-validator';
import { InvalidCpfError } from '@accounts/domain/errors/invalid-cpf-error';
import { ValueObject } from '@core/entities/value-object';

interface CpfProps {
  value: string;
}

export class Cpf extends ValueObject<CpfProps>{
  get value(): string {
    return this.props.value;
  }

  private constructor(props: CpfProps) {
    super(props);
  }

  public static create(value: string): Cpf {
    const sanitized = value.replace(/\D/g, '');

    if (!cpfValidator.isValid(sanitized)) {
      throw new InvalidCpfError();
    }

    return new Cpf({ value: sanitized });
  }

  public format(): string {
    return cpfValidator.format(this.value);
  }

  public equals(other: Cpf): boolean {
    return this.props.value === other.props.value;
  }
}
