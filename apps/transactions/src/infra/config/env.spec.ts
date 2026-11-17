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

  it('aplica padrões do cliente de accounts e aceita sobrescrita', () => {
    const env = validateEnv({ TRANSACTIONS_DATABASE_URL: url });
    expect(env.ACCOUNTS_SERVICE_URL).toBe('http://localhost:3001');
    expect(env.ACCOUNTS_REQUEST_TIMEOUT_MS).toBe(3000);

    const custom = validateEnv({
      TRANSACTIONS_DATABASE_URL: url,
      ACCOUNTS_SERVICE_URL: 'http://accounts:3001',
      ACCOUNTS_REQUEST_TIMEOUT_MS: '500',
    });
    expect(custom.ACCOUNTS_SERVICE_URL).toBe('http://accounts:3001');
    expect(custom.ACCOUNTS_REQUEST_TIMEOUT_MS).toBe(500);
  });

  it('falha com URL de accounts ou timeout inválidos', () => {
    expect(() => validateEnv({ TRANSACTIONS_DATABASE_URL: url, ACCOUNTS_SERVICE_URL: 'ftp://x' })).toThrow();
    expect(() => validateEnv({ TRANSACTIONS_DATABASE_URL: url, ACCOUNTS_REQUEST_TIMEOUT_MS: '0' })).toThrow();
  });

  it('falha sem TRANSACTIONS_DATABASE_URL', () => {
    expect(() => validateEnv({})).toThrow(/Invalid environment variables/);
  });

  it('falha com porta inválida', () => {
    expect(() => validateEnv({ TRANSACTIONS_DATABASE_URL: url, TRANSACTIONS_PORT: '0' })).toThrow();
  });
});
