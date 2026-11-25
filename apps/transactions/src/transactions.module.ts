import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AccountsGateway } from './application/gateways/accounts-gateway.js';
import { validateEnv } from './infra/config/env.js';
import { DatabaseModule } from './infra/database/database.module.js';
import { HttpAccountsGateway } from './infra/gateways/http-accounts.gateway.js';
import { TransactionsController } from './infra/http/transactions.controller.js';
import { useCaseProviders } from './infra/use-case-providers.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }), DatabaseModule],
  providers: [
    {
      provide: AccountsGateway,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new HttpAccountsGateway({
          baseUrl: config.getOrThrow<string>('ACCOUNTS_SERVICE_URL'),
          timeoutMs: config.getOrThrow<number>('ACCOUNTS_REQUEST_TIMEOUT_MS'),
        }),
    },
    ...useCaseProviders,
  ],
  exports: [AccountsGateway],
  controllers: [TransactionsController],
})
export class TransactionsModule {}
