import { describe, expect, test } from 'vitest';
import { InvalidIdempotencyKeyError } from '../errors/invalid-idempotency-key-error';
import { IdempotencyKey } from './idempotency-key';

describe('IdempotencyKey', () => {
  test('trims the value', () => {
    expect(IdempotencyKey.create('  key-1 ').value).toBe('key-1');
  });

  test('rejects empty or blank keys', () => {
    expect(() => IdempotencyKey.create('')).toThrow(InvalidIdempotencyKeyError);
    expect(() => IdempotencyKey.create('   ')).toThrow(InvalidIdempotencyKeyError);
  });

  test('rejects keys longer than 255 characters', () => {
    expect(() => IdempotencyKey.create('a'.repeat(256))).toThrow(InvalidIdempotencyKeyError);
    expect(IdempotencyKey.create('a'.repeat(255)).value).toHaveLength(255);
  });
});
