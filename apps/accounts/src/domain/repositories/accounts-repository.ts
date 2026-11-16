import { Account } from '../entities/account';

export abstract class AccountsRepository {
  abstract findById(id: string): Promise<Account | null>;
  abstract findByCpf(cpf: string): Promise<Account | null>;
  abstract save(account: Account): Promise<void>;
}
