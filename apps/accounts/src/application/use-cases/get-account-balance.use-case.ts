import { AccountNotFoundError } from '@accounts/domain/errors/account-not-found-error';
import { AccountsRepository } from '@accounts/domain/repositories/accounts-repository';

export interface GetAccountBalanceOutput {
  accountId: string;
  balance: number; // centavos
}

export class GetAccountBalanceUseCase {
  constructor(private readonly accountsRepository: AccountsRepository) {}

  async execute(accountId: string): Promise<GetAccountBalanceOutput> {
    const account = await this.accountsRepository.findById(accountId);
    if (!account) {
      throw new AccountNotFoundError();
    }

    return { accountId: account.id.toString(), balance: account.balance.amount };
  }
}
