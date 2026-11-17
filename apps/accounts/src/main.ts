import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AccountsModule } from './accounts.module.js';
import type { Env } from './infra/config/env.js';
import { setupApp } from './infra/http/setup-app.js';

async function bootstrap() {
  const app = await NestFactory.create(AccountsModule);
  setupApp(app);
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  await app.listen(config.get('ACCOUNTS_PORT', { infer: true }));
}
await bootstrap();
