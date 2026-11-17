import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateAccountDto {
  @ApiProperty({ example: 'Maria Silva' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '529.982.247-25', description: 'CPF com ou sem máscara' })
  @IsString()
  @IsNotEmpty()
  cpf: string;

  @ApiProperty({ example: 'maria@email.com' })
  @IsEmail()
  email: string;
}
