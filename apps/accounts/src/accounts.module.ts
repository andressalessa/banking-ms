import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './infra/config/env.js';
import { AccountsController } from './infra/http/accounts.controller.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnv })],
  controllers: [AccountsController],
  providers: [],
})
export class AccountsModule {}
