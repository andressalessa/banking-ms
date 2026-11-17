import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AccountsModule } from './accounts.module.js';
import type { Env } from './infra/config/env.js';

async function bootstrap() {
  const app = await NestFactory.create(AccountsModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  await app.listen(config.get('ACCOUNTS_PORT', { infer: true }));
}
await bootstrap();
