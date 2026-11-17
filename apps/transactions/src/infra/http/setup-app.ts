import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter, type DomainErrorStatusMap } from '@core/http/http-exception.filter';
import { createValidationPipe } from '@core/http/validation';

// Mapa DomainError -> status HTTP; populado conforme os erros de domínio surgirem.
const statusMap: DomainErrorStatusMap = new Map();

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
