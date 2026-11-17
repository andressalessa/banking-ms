import type { Provider } from '@nestjs/common';
import { CreateAccountUseCase } from '@accounts/application/use-cases/create-account.use-case';
import { CreditAccountUseCase } from '@accounts/application/use-cases/credit-account.use-case';
import { DebitAccountUseCase } from '@accounts/application/use-cases/debit-account.use-case';
import { GetAccountBalanceUseCase } from '@accounts/application/use-cases/get-account-balance.use-case';
import { GetAccountUseCase } from '@accounts/application/use-cases/get-account.use-case';
import { AccountsRepository } from '@accounts/domain/repositories/accounts-repository';

// Use cases são classes puras (sem decorators do Nest); a DI é ligada aqui, na infra.
export const useCaseProviders: Provider[] = [
  CreateAccountUseCase,
  GetAccountUseCase,
  GetAccountBalanceUseCase,
  CreditAccountUseCase,
  DebitAccountUseCase,
].map((useCase) => ({
  provide: useCase,
  useFactory: (repository: AccountsRepository) => new useCase(repository),
  inject: [AccountsRepository],
}));
