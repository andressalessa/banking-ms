import { describe, expect, test } from 'vitest';
import { InvalidCpfError } from '../errors/invalid-cpf-error';
import { Cpf } from './cpf';

describe('Cpf Value Object', () => {
  test('creates from a valid CPF', () => {
    expect(Cpf.create('52998224725').value).toBe('52998224725');
  });

  test('sanitizes a formatted CPF', () => {
    expect(Cpf.create('529.982.247-25').value).toBe('52998224725');
  });

  test('formats the CPF', () => {
    expect(Cpf.create('52998224725').format()).toBe('529.982.247-25');
  });

  test('rejects invalid check digits', () => {
    expect(() => Cpf.create('52998224726')).toThrow(InvalidCpfError);
  });

  test('rejects repeated digits', () => {
    expect(() => Cpf.create('11111111111')).toThrow(InvalidCpfError);
  });

  test('rejects wrong length and empty', () => {
    expect(() => Cpf.create('123')).toThrow(InvalidCpfError);
    expect(() => Cpf.create('')).toThrow(InvalidCpfError);
  });

  test('compares with equals', () => {
    expect(Cpf.create('52998224725').equals(Cpf.create('529.982.247-25'))).toBe(true);
  });
});
