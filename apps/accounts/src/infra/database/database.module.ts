import { Global, Module } from '@nestjs/common';
import { AccountEventStore } from '@accounts/domain/repositories/account-event-store';
import { AccountsRepository } from '@accounts/domain/repositories/accounts-repository';
import { EventStoreAccountsRepository } from './event-store-accounts.repository.js';
import { PrismaAccountEventStore } from './prisma-account-event-store.js';
import { PrismaService } from './prisma.service.js';

@Global()
@Module({
  providers: [
    PrismaService,
    { provide: AccountEventStore, useClass: PrismaAccountEventStore },
    { provide: AccountsRepository, useClass: EventStoreAccountsRepository },
  ],
  exports: [AccountsRepository],
})
export class DatabaseModule {}
