import { ApiProperty } from '@nestjs/swagger';
import { TransactionStatus } from '@transactions/domain/enums/transaction-status';

export class ExecuteTransactionResponse {
  @ApiProperty({ format: 'uuid' }) transactionId: string;
  @ApiProperty({ enum: TransactionStatus }) status: TransactionStatus;
}

export class ErrorResponseDto {
  @ApiProperty({ example: 'INSUFFICIENT_FUNDS' }) code: string;
  @ApiProperty() message: string;
  @ApiProperty({ required: false }) details?: unknown;
  @ApiProperty() timestamp: string;
  @ApiProperty() path: string;
}
