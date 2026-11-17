import { AccountNotFoundError } from '@accounts/domain/errors/account-not-found-error';
import { AccountsRepository } from '@accounts/domain/repositories/accounts-repository';
import { Money } from '@accounts/domain/value-objects/money';

export interface DebitAccountInput {
  accountId: string;
  amount: number; // centavos
}

export interface DebitAccountOutput {
  balance: number; // centavos
}

export class DebitAccountUseCase {
  constructor(private readonly accountsRepository: AccountsRepository) {}

  async execute(input: DebitAccountInput): Promise<DebitAccountOutput> {
    const amount = Money.create(input.amount);

    const account = await this.accountsRepository.findById(input.accountId);
    if (!account) {
      throw new AccountNotFoundError();
    }

    account.debit(amount);
    await this.accountsRepository.save(account);

    return { balance: account.balance.amount };
  }
}
