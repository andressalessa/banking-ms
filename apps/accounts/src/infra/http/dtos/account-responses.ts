import { ApiProperty } from '@nestjs/swagger';

export class CreateAccountResponse {
  @ApiProperty({ format: 'uuid' }) accountId: string;
}

export class AccountResponse {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() fullName: string;
  @ApiProperty({ example: '***.982.247-**', description: 'CPF mascarado' }) cpf: string;
  @ApiProperty() email: string;
  @ApiProperty({ description: 'Saldo em centavos' }) balance: number;
  @ApiProperty({ enum: ['ACTIVE', 'BLOCKED', 'CLOSED'] }) status: string;
  @ApiProperty() createdAt: string;
  @ApiProperty({ nullable: true, type: String }) updatedAt: string | null;
}

export class BalanceResponse {
  @ApiProperty({ format: 'uuid' }) accountId: string;
  @ApiProperty({ description: 'Saldo em centavos' }) balance: number;
}

export class ErrorResponseDto {
  @ApiProperty({ example: 'ACCOUNT_NOT_FOUND' }) code: string;
  @ApiProperty() message: string;
  @ApiProperty({ required: false }) details?: unknown;
  @ApiProperty() timestamp: string;
  @ApiProperty() path: string;
}
