import { BadRequestException } from '@nestjs/common';
import { extractIdempotencyKey } from './idempotency-key.decorator.js';

describe('extractIdempotencyKey', () => {
  it('devolve a chave sem espaços nas pontas', () => {
    expect(extractIdempotencyKey({ 'idempotency-key': ' abc ' })).toBe('abc');
  });

  it('usa o primeiro valor quando o header vem repetido', () => {
    expect(extractIdempotencyKey({ 'idempotency-key': ['a', 'b'] })).toBe('a');
  });

  it.each([{}, { 'idempotency-key': '   ' }])('rejeita ausente ou vazio: %j', (headers) => {
    expect(() => extractIdempotencyKey(headers)).toThrow(BadRequestException);
  });
});
