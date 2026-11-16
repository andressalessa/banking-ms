import { Module } from '@nestjs/common';
import { AccountsController } from './infra/http/accounts.controller.js';

@Module({
  imports: [],
  controllers: [AccountsController],
  providers: [],
})
export class AccountsModule {}
