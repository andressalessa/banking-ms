import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AccountNotFoundError } from '../../domain/errors/account-not-found-error';
import { AccountsServiceUnavailableError } from '../../domain/errors/accounts-service-unavailable-error';
import { HttpExceptionFilter, type DomainErrorStatusMap } from '@core/http/http-exception.filter';
import { createValidationPipe } from '@core/http/validation';

// Mapa DomainError -> status HTTP; os demais erros de domínio caem em 422.
const statusMap: DomainErrorStatusMap = new Map([
  [AccountNotFoundError, 404],
  [AccountsServiceUnavailableError, 503],
]);

/** Configuração HTTP compartilhada entre `main.ts` e os testes e2e. */
export function setupApp(app: INestApplication, options: { swagger?: boolean } = {}) {
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter(statusMap));

  if (options.swagger ?? true) {
    const config = new DocumentBuilder()
      .setTitle('Transactions API')
      .setDescription('Débitos, créditos e extrato')
      .setVersion('1.0')
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
  }
}
