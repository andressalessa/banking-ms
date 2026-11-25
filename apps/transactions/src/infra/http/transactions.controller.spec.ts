import { Test, TestingModule } from '@nestjs/testing';
import { ExecuteTransactionUseCase } from '@transactions/application/use-cases/execute-transaction.use-case';
import { TransactionType } from '@transactions/domain/enums/transaction-type';
import { TransactionsController } from './transactions.controller.js';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  const execute = vi.fn();

  beforeEach(async () => {
    execute.mockReset();
    execute.mockResolvedValue({ id: { toString: () => 'tx-1' }, status: 'COMPLETED' });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [{ provide: ExecuteTransactionUseCase, useValue: { execute } }],
    }).compile();

    controller = module.get(TransactionsController);
  });

  const body = { accountId: '2f6b7c1e-8a41-4c53-9d1e-5b0a7c9d3e11', amount: 1000 };

  it('debita com o tipo correto e devolve transactionId e status', async () => {
    const result = await controller.debit(body, 'key-1');

    expect(result).toEqual({ transactionId: 'tx-1', status: 'COMPLETED' });
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ type: TransactionType.DEBIT, idempotencyKey: 'key-1' }),
    );
  });

  it('credita com o tipo correto', async () => {
    await controller.credit(body, 'key-2');

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ type: TransactionType.CREDIT }),
    );
  });
});
