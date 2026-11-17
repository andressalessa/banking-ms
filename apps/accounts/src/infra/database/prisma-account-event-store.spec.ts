import { PrismaPg } from '@prisma/adapter-pg';
import { cpf as cpfGenerator } from 'cpf-cnpj-validator';
import { Account } from '@accounts/domain/entities/account';
import { ConcurrencyError } from '@accounts/domain/errors/concurrency-error';
import { CpfAlreadyRegisteredError } from '@accounts/domain/errors/cpf-already-registered-error';
import { AccountHolder } from '@accounts/domain/value-objects/account-holder';
import { Cpf } from '@accounts/domain/value-objects/cpf';
import { Email } from '@accounts/domain/value-objects/email';
import { Money } from '@accounts/domain/value-objects/money';
import { EventStoreAccountsRepository } from './event-store-accounts.repository';
import { PrismaClient } from './generated/client.js';
import { PrismaAccountEventStore } from './prisma-account-event-store';
import type { PrismaService } from './prisma.service';

// Integração: exige Postgres com as migrations aplicadas.
// Ex.: ACCOUNTS_TEST_DATABASE_URL=$ACCOUNTS_DATABASE_URL npm test
// Não limpa as tabelas (account_events é append-only): cada teste usa CPF/ids novos.
const url = process.env.ACCOUNTS_TEST_DATABASE_URL;

describe.skipIf(!url)('PrismaAccountEventStore (integração)', () => {
  let prisma: PrismaClient;
  let repo: EventStoreAccountsRepository;

  beforeAll(() => {
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
    repo = new EventStoreAccountsRepository(
      new PrismaAccountEventStore(prisma as unknown as PrismaService),
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const makeAccount = (cpf = cpfGenerator.generate()) =>
    Account.create({
      holder: AccountHolder.create({
        fullName: 'Maria Silva',
        cpf: Cpf.create(cpf),
        email: Email.create('maria@example.com'),
      }),
    });

  it('cria, muta e reconstrói a conta por replay', async () => {
    const account = makeAccount();
    account.credit(Money.create(2500));
    await repo.save(account);

    const loaded = (await repo.findById(account.id.toString()))!;
    loaded.debit(Money.create(500));
    await repo.save(loaded);

    const replayed = await repo.findById(account.id.toString());
    expect(replayed?.balance.amount).toBe(2000);
    expect(replayed?.version).toBe(3);
    expect(replayed?.createdAt).toEqual(account.createdAt);
  });

  it('busca por CPF via registry', async () => {
    const account = makeAccount();
    await repo.save(account);

    expect((await repo.findByCpf(account.holder.cpf.value))?.id.equals(account.id)).toBe(true);
  });

  it('rejeita CPF duplicado sem gravar eventos', async () => {
    const first = makeAccount();
    await repo.save(first);

    const duplicate = makeAccount(first.holder.cpf.value);
    await expect(repo.save(duplicate)).rejects.toBeInstanceOf(CpfAlreadyRegisteredError);
    expect(await repo.findById(duplicate.id.toString())).toBeNull();
  });

  it('conflito de versão gera ConcurrencyError', async () => {
    const account = makeAccount();
    await repo.save(account);
    const id = account.id.toString();

    const a = (await repo.findById(id))!;
    const b = (await repo.findById(id))!;
    a.credit(Money.create(100));
    b.credit(Money.create(200));

    await repo.save(a);
    await expect(repo.save(b)).rejects.toBeInstanceOf(ConcurrencyError);
  });

  it('saves concorrentes na mesma versão: apenas um vence', async () => {
    const account = makeAccount();
    await repo.save(account);
    const id = account.id.toString();

    const writers = await Promise.all([repo.findById(id), repo.findById(id), repo.findById(id)]);
    writers.forEach((w, i) => w!.credit(Money.create(100 * (i + 1))));

    const results = await Promise.allSettled(writers.map((w) => repo.save(w!)));

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect((await repo.findById(id))?.version).toBe(2);
  });

  it('account_events é imutável (UPDATE e DELETE falham)', async () => {
    const account = makeAccount();
    await repo.save(account);
    const id = account.id.toString();

    await expect(
      prisma.accountEvent.updateMany({ where: { aggregateId: id }, data: { eventType: 'X' } }),
    ).rejects.toThrow();
    await expect(prisma.accountEvent.deleteMany({ where: { aggregateId: id } })).rejects.toThrow();
  });
});
