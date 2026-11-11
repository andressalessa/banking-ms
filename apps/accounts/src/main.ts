import { NestFactory } from '@nestjs/core';
import { AccountsModule } from './accounts.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AccountsModule);
  await app.listen(process.env.port ?? 3000);
}
await bootstrap();
