import type { Account } from '@accounts/domain/entities/account';
import { AccountNotFoundError } from '@accounts/domain/errors/account-not-found-error';
import { AccountsRepository } from '@accounts/domain/repositories/accounts-repository';

export interface GetAccountOutput {
  account: Account;
}

export class GetAccountUseCase {
  constructor(private readonly accountsRepository: AccountsRepository) {}

  async execute(accountId: string): Promise<GetAccountOutput> {
    const account = await this.accountsRepository.findById(accountId);
    if (!account) {
      throw new AccountNotFoundError();
    }

    return { account };
  }
}
