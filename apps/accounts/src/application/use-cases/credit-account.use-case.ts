import { AccountNotFoundError } from '@accounts/domain/errors/account-not-found-error';
import { AccountsRepository } from '@accounts/domain/repositories/accounts-repository';
import { Money } from '@accounts/domain/value-objects/money';

export interface CreditAccountInput {
  accountId: string;
  amount: number; // centavos
}

export interface CreditAccountOutput {
  balance: number; // centavos
}

export class CreditAccountUseCase {
  constructor(private readonly accountsRepository: AccountsRepository) {}

  async execute(input: CreditAccountInput): Promise<CreditAccountOutput> {
    const amount = Money.create(input.amount);

    const account = await this.accountsRepository.findById(input.accountId);
    if (!account) {
      throw new AccountNotFoundError();
    }

    account.credit(amount);
    await this.accountsRepository.save(account);

    return { balance: account.balance.amount };
  }
}
