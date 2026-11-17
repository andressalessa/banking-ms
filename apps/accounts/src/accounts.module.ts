import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { useCaseProviders } from './infra/use-case-providers.js';
import { validateEnv } from './infra/config/env.js';
import { DatabaseModule } from './infra/database/database.module.js';
import { HealthController } from './infra/health/health.controller.js';
import { PrismaHealthIndicator } from './infra/health/prisma-health.indicator.js';
import { AccountsController } from './infra/http/accounts.controller.js';
import { InternalAccountsController } from './infra/http/internal-accounts.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    TerminusModule,
    DatabaseModule,
  ],
  controllers: [AccountsController, InternalAccountsController, HealthController],
  providers: [...useCaseProviders, PrismaHealthIndicator],
})
export class AccountsModule {}
