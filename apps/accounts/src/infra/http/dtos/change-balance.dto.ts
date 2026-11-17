import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class ChangeBalanceDto {
  @ApiProperty({ example: 10000, description: 'Valor em centavos (inteiro positivo)' })
  @IsInt()
  @IsPositive()
  amount: number;
}
