import { describe, expect, test } from 'vitest';
import { InvalidHolderNameError } from '../errors/invalid-holder-name-error';
import { AccountHolder } from './account-holder';
import { Cpf } from './cpf';
import { Email } from './email';

const base = {
  cpf: Cpf.create('52998224725'),
  email: Email.create('ada@lovelace.com'),
};

describe('AccountHolder Value Object', () => {
  test('creates a valid holder and trims the name', () => {
    const holder = AccountHolder.create({ ...base, fullName: '  Ada Lovelace  ' });

    expect(holder.fullName).toBe('Ada Lovelace');
    expect(holder.cpf.value).toBe('52998224725');
    expect(holder.email.value).toBe('ada@lovelace.com');
  });

  test('rejects empty or whitespace-only name', () => {
    expect(() => AccountHolder.create({ ...base, fullName: '' })).toThrow(
      InvalidHolderNameError,
    );
    expect(() => AccountHolder.create({ ...base, fullName: '   ' })).toThrow(
      'Holder name is required.',
    );
  });

  test('rejects names shorter than 3 characters', () => {
    expect(() => AccountHolder.create({ ...base, fullName: 'Al' })).toThrow(
      InvalidHolderNameError,
    );
  });

  test('rejects non-string name', () => {
    expect(() => AccountHolder.create({ ...base, fullName: null as any })).toThrow(
      InvalidHolderNameError,
    );
  });
});
