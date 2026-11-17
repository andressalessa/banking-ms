import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { cpf as cpfGenerator } from 'cpf-cnpj-validator';
import request from 'supertest';
import { AccountsRepository } from '@accounts/domain/repositories/accounts-repository';
import { InMemoryAccountsRepository } from '@accounts/test/repositories/in-memory-accounts-repository';
import { useCaseProviders } from '../use-case-providers.js';
import { AccountsController } from './accounts.controller.js';
import { InternalAccountsController } from './internal-accounts.controller.js';
import { setupApp } from './setup-app.js';

describe('Accounts HTTP', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AccountsController, InternalAccountsController],
      providers: [...useCaseProviders, { provide: AccountsRepository, useClass: InMemoryAccountsRepository }],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app, { swagger: false });
    await app.init();
  });

  afterEach(() => app.close());

  const create = (cpf = cpfGenerator.generate()) =>
    request(app.getHttpServer())
      .post('/accounts')
      .send({ fullName: 'Maria Silva', cpf, email: 'maria@example.com' });

  it('cria e consulta a conta, com CPF mascarado', async () => {
    const created = await create();
    expect(created.status).toBe(201);

    const res = await request(app.getHttpServer()).get(`/accounts/${created.body.accountId}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ fullName: 'Maria Silva', balance: 0, status: 'ACTIVE' });
    expect(res.body.cpf).toMatch(/^\*\*\*\.\d{3}\.\d{3}-\*\*$/);
  });

  it('retorna o saldo após crédito e débito internos', async () => {
    const { body } = await create();
    const server = app.getHttpServer();
    await request(server).post(`/internal/accounts/${body.accountId}/credit`).send({ amount: 1000 }).expect(200);
    await request(server).post(`/internal/accounts/${body.accountId}/debit`).send({ amount: 400 }).expect(200);

    const res = await request(server).get(`/accounts/${body.accountId}/balance`);
    expect(res.body).toEqual({ accountId: body.accountId, balance: 600 });
  });

  it('409 para CPF duplicado, no formato padronizado', async () => {
    const cpf = cpfGenerator.generate();
    await create(cpf);
    const res = await create(cpf);
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({
      code: 'CPF_ALREADY_REGISTERED',
      path: '/accounts',
    });
    expect(res.body.message).toBeTypeOf('string');
    expect(res.body.timestamp).toBeTypeOf('string');
  });

  it('404 para conta inexistente', async () => {
    const res = await request(app.getHttpServer()).get('/accounts/3f2b8a52-6f0e-4a55-9a7e-0d8a8a8a8a8a');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('ACCOUNT_NOT_FOUND');
  });

  it('422 para saldo insuficiente', async () => {
    const { body } = await create();
    const res = await request(app.getHttpServer())
      .post(`/internal/accounts/${body.accountId}/debit`)
      .send({ amount: 100 });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('INSUFFICIENT_FUNDS');
  });

  it('400 com detalhes para payload inválido', async () => {
    const res = await request(app.getHttpServer())
      .post('/accounts')
      .send({ fullName: '', email: 'x', extra: true });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it('400 para id que não é UUID e para valor não inteiro', async () => {
    const server = app.getHttpServer();
    await request(server).get('/accounts/abc').expect(400);
    const { body } = await create();
    await request(server)
      .post(`/internal/accounts/${body.accountId}/credit`)
      .send({ amount: 10.5 })
      .expect(400);
  });
});
