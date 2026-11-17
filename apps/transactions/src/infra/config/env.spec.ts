import 'reflect-metadata';
import { validateEnv } from './env';

const url = 'postgresql://postgres:pw@localhost:5433/transactions_db';

describe('validateEnv (transactions)', () => {
  it('aplica porta padrão 3002 e NODE_ENV development', () => {
    const env = validateEnv({ TRANSACTIONS_DATABASE_URL: url });
    expect(env.TRANSACTIONS_PORT).toBe(3002);
    expect(env.NODE_ENV).toBe('development');
  });

  it('converte a porta informada para número', () => {
    expect(validateEnv({ TRANSACTIONS_DATABASE_URL: url, TRANSACTIONS_PORT: '4000' }).TRANSACTIONS_PORT).toBe(4000);
  });

  it('falha sem TRANSACTIONS_DATABASE_URL', () => {
    expect(() => validateEnv({})).toThrow(/Invalid environment variables/);
  });

  it('falha com porta inválida', () => {
    expect(() => validateEnv({ TRANSACTIONS_DATABASE_URL: url, TRANSACTIONS_PORT: '0' })).toThrow();
  });
});
