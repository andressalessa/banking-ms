import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, IsUUID } from 'class-validator';

export class ExecuteTransactionDto {
  @ApiProperty({ format: 'uuid', description: 'Conta alvo da operação' })
  @IsUUID()
  accountId: string;

  @ApiProperty({ example: 1500, description: 'Valor em centavos (inteiro positivo)' })
  @IsInt()
  @IsPositive()
  amount: number;
}
