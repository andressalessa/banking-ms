import type { Provider } from '@nestjs/common';
import { AccountsGateway } from '@transactions/application/gateways/accounts-gateway';
import { ExecuteTransactionUseCase } from '@transactions/application/use-cases/execute-transaction.use-case';
import { TransactionsRepository } from '@transactions/domain/repositories/transactions-repository';

// Use cases são classes puras (sem decorators do Nest); a DI é ligada aqui, na infra.
export const useCaseProviders: Provider[] = [ExecuteTransactionUseCase].map(
  (useCase) => ({
    provide: useCase,
    useFactory: (
      transactionsRepository: TransactionsRepository,
      accountsGateway: AccountsGateway,
    ) => new useCase(transactionsRepository, accountsGateway),
    inject: [TransactionsRepository, AccountsGateway],
  }),
);
