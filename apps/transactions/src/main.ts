import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { TransactionsModule } from './transactions.module.js';
import type { Env } from './config/env.js';

async function bootstrap() {
  const app = await NestFactory.create(TransactionsModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  await app.listen(config.get('TRANSACTIONS_PORT', { infer: true }));
}
await bootstrap();
