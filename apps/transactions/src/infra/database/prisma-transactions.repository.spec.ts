import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { Transaction } from '@transactions/domain/entities/transaction';
import { TransactionStatus } from '@transactions/domain/enums/transaction-status';
import { TransactionType } from '@transactions/domain/enums/transaction-type';
import { IdempotencyKey } from '@transactions/domain/value-objects/idempotency-key';
import { Money } from '@transactions/domain/value-objects/money';
import { PrismaClient } from '../../../prisma/generated/client.js';
import { PrismaTransactionsRepository } from './prisma-transactions.repository';
import type { PrismaService } from './prisma.service';

// Integração: exige Postgres com as migrations aplicadas.
// Ex.: TRANSACTIONS_TEST_DATABASE_URL=$TRANSACTIONS_DATABASE_URL npm test
// Cada teste usa ids e chaves novos, então não precisa limpar as tabelas.
const url = process.env.TRANSACTIONS_TEST_DATABASE_URL;

describe.skipIf(!url)('PrismaTransactionsRepository (integração)', () => {
  let prisma: PrismaClient;
  let repo: PrismaTransactionsRepository;

  beforeAll(() => {
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
    repo = new PrismaTransactionsRepository(prisma as unknown as PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const makeTransaction = (overrides: { accountId?: string; key?: string } = {}) =>
    Transaction.create({
      accountId: overrides.accountId ?? randomUUID(),
      type: TransactionType.DEBIT,
      amount: Money.create(1500),
      idempotencyKey: IdempotencyKey.create(overrides.key ?? randomUUID()),
    });

  it('persiste e reconstitui por id e por chave de idempotência', async () => {
    const transaction = makeTransaction();
    await repo.save(transaction);

    const byId = await repo.findById(transaction.id.toString());
    const byKey = await repo.findByIdempotencyKey(transaction.idempotencyKey.value);

    expect(byId?.accountId).toBe(transaction.accountId);
    expect(byId?.amount.amount).toBe(1500);
    expect(byId?.status).toBe(TransactionStatus.PENDING);
    expect(byKey?.id.toString()).toBe(transaction.id.toString());
  });

  it('retorna null quando não encontra', async () => {
    expect(await repo.findById(randomUUID())).toBeNull();
    expect(await repo.findByIdempotencyKey(randomUUID())).toBeNull();
  });

  it('grava o evento no outbox junto com o estado COMPLETED e limpa os eventos', async () => {
    const transaction = makeTransaction();
    transaction.complete();
    const eventId = transaction.domainEvents[0].eventId;

    await repo.save(transaction);

    const loaded = await repo.findById(transaction.id.toString());
    const outbox = await prisma.outboxEvent.findUnique({ where: { id: eventId } });

    expect(loaded?.status).toBe(TransactionStatus.COMPLETED);
    expect(outbox?.eventType).toBe('DebitPerformed');
    expect(outbox?.publishedAt).toBeNull();
    expect(transaction.domainEvents).toHaveLength(0);
  });

  it('rejeita a mesma chave de idempotência em outra transação', async () => {
    const key = randomUUID();
    await repo.save(makeTransaction({ key }));

    await expect(repo.save(makeTransaction({ key }))).rejects.toThrow();
  });

  it('não deixa estado nem outbox se a gravação falhar', async () => {
    const key = randomUUID();
    await repo.save(makeTransaction({ key }));

    const duplicate = makeTransaction({ key });
    duplicate.complete();
    const eventId = duplicate.domainEvents[0].eventId;

    await expect(repo.save(duplicate)).rejects.toThrow();

    expect(await prisma.outboxEvent.findUnique({ where: { id: eventId } })).toBeNull();
    expect(duplicate.domainEvents).toHaveLength(1);
  });

  it('lista por conta, filtrando por período', async () => {
    const accountId = randomUUID();
    await repo.save(makeTransaction({ accountId }));
    await repo.save(makeTransaction({ accountId }));
    await repo.save(makeTransaction());

    expect(await repo.listByAccount(accountId, {})).toHaveLength(2);
    expect(
      await repo.listByAccount(accountId, { from: new Date(Date.now() + 60_000) }),
    ).toHaveLength(0);
  });
});
