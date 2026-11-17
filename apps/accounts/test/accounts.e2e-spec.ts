import { execSync } from 'node:child_process';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { cpf as cpfGenerator } from 'cpf-cnpj-validator';
import request from 'supertest';

// E2E: app Nest real + Postgres descartável (Testcontainers) com as migrations aplicadas.
// Exige Docker em execução. Rodar com: npm run test:e2e
describe('Accounts API (e2e)', () => {
  let container: StartedPostgreSqlContainer;
  let app: INestApplication;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    const url = container.getConnectionUri();

    execSync('npx prisma migrate deploy --config apps/accounts/prisma.config.ts', {
      env: { ...process.env, ACCOUNTS_DATABASE_URL: url },
      stdio: 'pipe',
    });

    // O módulo lê e valida o env na importação (ConfigModule.forRoot), então o import vem depois.
    process.env.ACCOUNTS_DATABASE_URL = url;
    const { AccountsModule } = await import('@accounts/accounts.module');
    const { setupApp } = await import('@accounts/infra/http/setup-app');

    const moduleRef = await Test.createTestingModule({ imports: [AccountsModule] }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app, { swagger: false });
    await app.init();
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await container?.stop();
  });

  const server = () => app.getHttpServer();

  const createAccount = (cpf = cpfGenerator.generate()) =>
    request(server())
      .post('/accounts')
      .send({ fullName: 'Maria Silva', cpf, email: 'maria@example.com' });

  it('GET /health: 200 com o Postgres no ar', async () => {
    const res = await request(server()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', info: { postgres: { status: 'up' } } });
  });

  it('cria conta e consulta com CPF mascarado', async () => {
    const created = await createAccount();
    expect(created.status).toBe(201);

    const res = await request(server()).get(`/accounts/${created.body.accountId}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ fullName: 'Maria Silva', balance: 0, status: 'ACTIVE' });
    expect(res.body.cpf).toMatch(/^\*\*\*\.\d{3}\.\d{3}-\*\*$/);
  });

  it('409 CPF_ALREADY_REGISTERED para CPF duplicado, no formato padronizado', async () => {
    const cpf = cpfGenerator.generate();
    await createAccount(cpf).expect(201);

    const res = await createAccount(cpf);
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'CPF_ALREADY_REGISTERED', path: '/accounts' });
    expect(res.body.message).toBeTypeOf('string');
    expect(res.body.timestamp).toBeTypeOf('string');
  });

  it('busca o saldo após crédito e débito (replay do event store)', async () => {
    const { body } = await createAccount();
    const id = body.accountId;
    await request(server()).post(`/internal/accounts/${id}/credit`).send({ amount: 1000 }).expect(200);
    await request(server()).post(`/internal/accounts/${id}/debit`).send({ amount: 300 }).expect(200);

    const res = await request(server()).get(`/accounts/${id}/balance`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ accountId: id, balance: 700 });
  });

  it('422 INSUFFICIENT_FUNDS e saldo preservado', async () => {
    const { body } = await createAccount();
    const res = await request(server())
      .post(`/internal/accounts/${body.accountId}/debit`)
      .send({ amount: 100 });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('INSUFFICIENT_FUNDS');

    const balance = await request(server()).get(`/accounts/${body.accountId}/balance`);
    expect(balance.body.balance).toBe(0);
  });

  it('404 ACCOUNT_NOT_FOUND para conta inexistente', async () => {
    const res = await request(server()).get('/accounts/3f2b8a52-6f0e-4a55-9a7e-0d8a8a8a8a8a');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ code: 'ACCOUNT_NOT_FOUND' });
  });

  it('400 VALIDATION_ERROR com details para payload inválido', async () => {
    const res = await request(server()).post('/accounts').send({ fullName: '', email: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  // Mantido por último: derruba o banco.
  it('GET /health: 503 com o Postgres fora do ar', async () => {
    await container.stop();

    const res = await request(server()).get('/health');
    expect(res.status).toBe(503);
    // O filtro global padroniza o erro (o detalhe do indicador vai para o log).
    expect(res.body).toMatchObject({ code: 'SERVICE_UNAVAILABLE', path: '/health' });
  }, 60_000);
});
