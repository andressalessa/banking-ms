import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConcurrencyError } from '@accounts/domain/errors/concurrency-error';
import { AccountBlockedError } from '@accounts/domain/errors/account-blocked-error';
import { AccountNotFoundError } from '@accounts/domain/errors/account-not-found-error';
import { CpfAlreadyRegisteredError } from '@accounts/domain/errors/cpf-already-registered-error';
import { HttpExceptionFilter, type DomainErrorStatusMap } from '@core/http/http-exception.filter';
import { createValidationPipe } from '@core/http/validation';

const statusMap: DomainErrorStatusMap = new Map([
  [AccountNotFoundError, 404],
  [CpfAlreadyRegisteredError, 409],
  [ConcurrencyError, 409],
  [AccountBlockedError, 422],
]);

/** Configuração HTTP compartilhada entre `main.ts` e os testes e2e. */
export function setupApp(app: INestApplication, options: { swagger?: boolean } = {}) {
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter(statusMap));

  if (options.swagger ?? true) {
    const config = new DocumentBuilder()
      .setTitle('Accounts API')
      .setDescription('Contas bancárias (event sourced)')
      .setVersion('1.0')
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
  }
}
