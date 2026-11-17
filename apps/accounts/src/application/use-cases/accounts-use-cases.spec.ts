import { beforeEach, describe, expect, it } from 'vitest';
import { AccountBlockedError } from '@accounts/domain/errors/account-blocked-error';
import { AccountNotFoundError } from '@accounts/domain/errors/account-not-found-error';
import { CpfAlreadyRegisteredError } from '@accounts/domain/errors/cpf-already-registered-error';
import { InsufficientFundsError } from '@accounts/domain/errors/insufficient-funds-error';
import { InvalidAmountError } from '@accounts/domain/errors/invalid-amount-error';
import { InvalidCpfError } from '@accounts/domain/errors/invalid-cpf-error';
import { InvalidEmailError } from '@accounts/domain/errors/invalid-email-error';
import { InvalidHolderNameError } from '@accounts/domain/errors/invalid-holder-name-error';
import { InMemoryAccountsRepository } from '../../test/repositories/in-memory-accounts-repository';
import { CreateAccountUseCase } from './create-account.use-case';
import { CreditAccountUseCase } from './credit-account.use-case';
import { DebitAccountUseCase } from './debit-account.use-case';
import { GetAccountBalanceUseCase } from './get-account-balance.use-case';
import { GetAccountUseCase } from './get-account.use-case';

const VALID_CPF = '529.982.247-25';
const validInput = { fullName: 'Maria Silva', cpf: VALID_CPF, email: 'maria@example.com' };

let repo: InMemoryAccountsRepository;

beforeEach(() => {
  repo = new InMemoryAccountsRepository();
});

describe('CreateAccountUseCase', () => {
  it('cria a conta e persiste', async () => {
    const { accountId } = await new CreateAccountUseCase(repo).execute(validInput);

    expect(repo.items).toHaveLength(1);
    expect(repo.items[0].id.toString()).toBe(accountId);
    expect(repo.items[0].holder.cpf.value).toBe('52998224725');
  });

  it('rejeita CPF duplicado', async () => {
    const sut = new CreateAccountUseCase(repo);
    await sut.execute(validInput);

    await expect(sut.execute({ ...validInput, cpf: '52998224725' })).rejects.toBeInstanceOf(
      CpfAlreadyRegisteredError,
    );
    expect(repo.items).toHaveLength(1);
  });

  it('rejeita CPF inválido', async () => {
    await expect(
      new CreateAccountUseCase(repo).execute({ ...validInput, cpf: '111.111.111-11' }),
    ).rejects.toBeInstanceOf(InvalidCpfError);
  });

  it('rejeita email inválido', async () => {
    await expect(
      new CreateAccountUseCase(repo).execute({ ...validInput, email: 'invalido' }),
    ).rejects.toBeInstanceOf(InvalidEmailError);
  });

  it('rejeita nome inválido', async () => {
    await expect(
      new CreateAccountUseCase(repo).execute({ ...validInput, fullName: 'Ab' }),
    ).rejects.toBeInstanceOf(InvalidHolderNameError);
    expect(repo.items).toHaveLength(0);
  });
});

async function seedAccount() {
  const { accountId } = await new CreateAccountUseCase(repo).execute(validInput);
  return accountId;
}

describe('GetAccountUseCase / GetAccountBalanceUseCase', () => {
  it('retorna a conta', async () => {
    const accountId = await seedAccount();
    const { account } = await new GetAccountUseCase(repo).execute(accountId);
    expect(account.id.toString()).toBe(accountId);
  });

  it('retorna o saldo', async () => {
    const accountId = await seedAccount();
    await new CreditAccountUseCase(repo).execute({ accountId, amount: 1500 });

    await expect(new GetAccountBalanceUseCase(repo).execute(accountId)).resolves.toEqual({
      accountId,
      balance: 1500,
    });
  });

  it('lança AccountNotFoundError quando não existe', async () => {
    await expect(new GetAccountUseCase(repo).execute('x')).rejects.toBeInstanceOf(
      AccountNotFoundError,
    );
    await expect(new GetAccountBalanceUseCase(repo).execute('x')).rejects.toBeInstanceOf(
      AccountNotFoundError,
    );
  });
});

describe('CreditAccountUseCase', () => {
  it('credita e persiste o saldo', async () => {
    const accountId = await seedAccount();
    const out = await new CreditAccountUseCase(repo).execute({ accountId, amount: 1000 });

    expect(out.balance).toBe(1000);
    expect(repo.items[0].balance.amount).toBe(1000);
  });

  it('rejeita conta inexistente', async () => {
    await expect(
      new CreditAccountUseCase(repo).execute({ accountId: 'x', amount: 100 }),
    ).rejects.toBeInstanceOf(AccountNotFoundError);
  });

  it('rejeita valor zero, negativo ou fracionado', async () => {
    const accountId = await seedAccount();
    const sut = new CreditAccountUseCase(repo);

    await expect(sut.execute({ accountId, amount: 0 })).rejects.toBeInstanceOf(InvalidAmountError);
    await expect(sut.execute({ accountId, amount: -1 })).rejects.toBeInstanceOf(InvalidAmountError);
    await expect(sut.execute({ accountId, amount: 1.5 })).rejects.toBeInstanceOf(InvalidAmountError);
  });

  it('rejeita conta bloqueada', async () => {
    const accountId = await seedAccount();
    repo.items[0].block();

    await expect(
      new CreditAccountUseCase(repo).execute({ accountId, amount: 100 }),
    ).rejects.toBeInstanceOf(AccountBlockedError);
  });
});

describe('DebitAccountUseCase', () => {
  it('debita e persiste o saldo', async () => {
    const accountId = await seedAccount();
    await new CreditAccountUseCase(repo).execute({ accountId, amount: 1000 });
    const out = await new DebitAccountUseCase(repo).execute({ accountId, amount: 400 });

    expect(out.balance).toBe(600);
    expect(repo.items[0].balance.amount).toBe(600);
  });

  it('rejeita saldo insuficiente sem alterar a conta', async () => {
    const accountId = await seedAccount();
    await new CreditAccountUseCase(repo).execute({ accountId, amount: 100 });

    await expect(
      new DebitAccountUseCase(repo).execute({ accountId, amount: 101 }),
    ).rejects.toBeInstanceOf(InsufficientFundsError);
    expect(repo.items[0].balance.amount).toBe(100);
  });

  it('rejeita conta inexistente, valor inválido e conta bloqueada', async () => {
    const sut = new DebitAccountUseCase(repo);
    await expect(sut.execute({ accountId: 'x', amount: 100 })).rejects.toBeInstanceOf(
      AccountNotFoundError,
    );

    const accountId = await seedAccount();
    await expect(sut.execute({ accountId, amount: 0 })).rejects.toBeInstanceOf(InvalidAmountError);

    repo.items[0].block();
    await expect(sut.execute({ accountId, amount: 100 })).rejects.toBeInstanceOf(
      AccountBlockedError,
    );
  });
});
