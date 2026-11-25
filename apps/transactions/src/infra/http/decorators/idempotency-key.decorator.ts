import {
  BadRequestException,
  createParamDecorator,
  type ExecutionContext,
} from '@nestjs/common';

const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';

/** Extrai o header `Idempotency-Key`; lança 400 se ausente ou vazio. */
export function extractIdempotencyKey(
  headers: Record<string, string | string[] | undefined>,
): string {
  const raw = headers[IDEMPOTENCY_KEY_HEADER];
  const value = Array.isArray(raw) ? raw[0] : raw;

  if (!value?.trim()) {
    throw new BadRequestException('Header Idempotency-Key é obrigatório');
  }

  return value.trim();
}

/** Parâmetro que injeta o `Idempotency-Key` já validado. */
export const IdempotencyKey = createParamDecorator((_data: unknown, ctx: ExecutionContext) =>
  extractIdempotencyKey(ctx.switchToHttp().getRequest().headers),
);
