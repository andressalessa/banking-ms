import { Account } from '@accounts/domain/entities/account';
import { CpfAlreadyRegisteredError } from '@accounts/domain/errors/cpf-already-registered-error';
import { AccountsRepository } from '@accounts/domain/repositories/accounts-repository';
import { AccountHolder } from '@accounts/domain/value-objects/account-holder';
import { Cpf } from '@accounts/domain/value-objects/cpf';
import { Email } from '@accounts/domain/value-objects/email';

export interface CreateAccountInput {
  fullName: string;
  cpf: string;
  email: string;
}

export interface CreateAccountOutput {
  accountId: string;
}

export class CreateAccountUseCase {
  constructor(private readonly accountsRepository: AccountsRepository) {}

  async execute(input: CreateAccountInput): Promise<CreateAccountOutput> {
    const cpf = Cpf.create(input.cpf);
    const email = Email.create(input.email);
    const holder = AccountHolder.create({ fullName: input.fullName, cpf, email });

    const existing = await this.accountsRepository.findByCpf(cpf.value);
    if (existing) {
      throw new CpfAlreadyRegisteredError();
    }

    const account = Account.create({ holder });
    await this.accountsRepository.save(account);

    return { accountId: account.id.toString() };
  }
}
