import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiDefaultResponse,
  ApiHeader,
  ApiTags,
} from '@nestjs/swagger';
import { ExecuteTransactionUseCase } from '@transactions/application/use-cases/execute-transaction.use-case';
import { TransactionType } from '@transactions/domain/enums/transaction-type';
import { Money } from '@transactions/domain/value-objects/money';
import { IdempotencyKey } from './decorators/idempotency-key.decorator.js';
import { ExecuteTransactionDto } from './dtos/execute-transaction.dto.js';
import {
  ErrorResponseDto,
  ExecuteTransactionResponse,
} from './dtos/transaction-responses.js';

@ApiTags('transactions')
@ApiDefaultResponse({ type: ErrorResponseDto, description: 'Erro padronizado' })
@ApiHeader({
  name: 'Idempotency-Key',
  required: true,
  description: 'Repetir a mesma chave com o mesmo payload devolve a transação original',
})
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly executeTransaction: ExecuteTransactionUseCase) {}

  @Post('debit')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: ExecuteTransactionResponse })
  debit(
    @Body() body: ExecuteTransactionDto,
    @IdempotencyKey() idempotencyKey: string,
  ): Promise<ExecuteTransactionResponse> {
    return this.run(TransactionType.DEBIT, body, idempotencyKey);
  }

  @Post('credit')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: ExecuteTransactionResponse })
  credit(
    @Body() body: ExecuteTransactionDto,
    @IdempotencyKey() idempotencyKey: string,
  ): Promise<ExecuteTransactionResponse> {
    return this.run(TransactionType.CREDIT, body, idempotencyKey);
  }

  private async run(
    type: TransactionType,
    { accountId, amount }: ExecuteTransactionDto,
    idempotencyKey: string,
  ): Promise<ExecuteTransactionResponse> {
    const transaction = await this.executeTransaction.execute({
      accountId,
      type,
      amount: Money.create(amount),
      idempotencyKey,
    });

    return {
      transactionId: transaction.id.toString(),
      status: transaction.status,
    };
  }
}
