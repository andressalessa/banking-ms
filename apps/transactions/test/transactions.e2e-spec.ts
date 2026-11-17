import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

describe('Transactions API (e2e) - setup', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // O módulo valida o env na importação (ConfigModule.forRoot), então o import vem depois.
    process.env.TRANSACTIONS_DATABASE_URL = 'postgresql://postgres:pw@localhost:5433/transactions_db';
    const { TransactionsModule } = await import('@transactions/transactions.module');
    const { setupApp } = await import('@transactions/infra/http/setup-app');
    const moduleRef = await Test.createTestingModule({ imports: [TransactionsModule] }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app, { swagger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('sobe o app e responde erro no formato padronizado', async () => {
    const res = await request(app.getHttpServer()).get('/inexistente').expect(404);
    expect(res.body).toMatchObject({ code: 'NOT_FOUND', path: '/inexistente' });
    expect(res.body.timestamp).toBeDefined();
  });
});
