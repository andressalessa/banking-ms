import { Global, Module } from '@nestjs/common';
import { TransactionsRepository } from '@transactions/domain/repositories/transactions-repository';
import { PrismaService } from './prisma.service.js';
import { PrismaTransactionsRepository } from './repositories/prisma-transactions.repository.js';

@Global()
@Module({
  providers: [
    PrismaService,
    { provide: TransactionsRepository, useClass: PrismaTransactionsRepository },
  ],
  exports: [TransactionsRepository, PrismaService],
})
export class DatabaseModule {}
