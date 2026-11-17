import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { DomainError } from '../errors/domain-error';
import type { ErrorResponse } from './error-response';

export type DomainErrorStatusMap = ReadonlyMap<abstract new (...args: never[]) => DomainError, number>;

/**
 * Filtro global compartilhado pelos serviços: converte qualquer exceção no
 * formato `{ code, message, details?, timestamp, path }`.
 * Erros de domínio sem mapeamento explícito viram 422.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly statusMap: DomainErrorStatusMap = new Map()) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { status, body } = this.build(exception, request.url);
    if (status >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }
    response.status(status).json(body);
  }

  private build(exception: unknown, path: string): { status: number; body: ErrorResponse } {
    const timestamp = new Date().toISOString();

    if (exception instanceof DomainError) {
      const status = this.resolveStatus(exception);
      return { status, body: { code: exception.code, message: exception.message, timestamp, path } };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const raw = typeof res === 'string' ? res : (res as { message?: unknown }).message;
      const isValidation = status === HttpStatus.BAD_REQUEST && Array.isArray(raw);
      return {
        status,
        body: {
          code: isValidation ? 'VALIDATION_ERROR' : HttpStatus[status] ?? 'HTTP_ERROR',
          message: isValidation ? 'Request validation failed' : String(raw ?? exception.message),
          ...(isValidation ? { details: raw } : {}),
          timestamp,
          path,
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { code: 'INTERNAL_ERROR', message: 'Internal server error', timestamp, path },
    };
  }

  private resolveStatus(error: DomainError): number {
    for (const [type, status] of this.statusMap) {
      if (error instanceof type) return status;
    }
    return HttpStatus.UNPROCESSABLE_ENTITY;
  }
}
