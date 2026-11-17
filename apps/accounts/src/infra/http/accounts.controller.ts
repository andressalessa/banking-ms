import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiDefaultResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CreateAccountUseCase } from '@accounts/application/use-cases/create-account.use-case';
import { GetAccountBalanceUseCase } from '@accounts/application/use-cases/get-account-balance.use-case';
import { GetAccountUseCase } from '@accounts/application/use-cases/get-account.use-case';
import { AccountIdParam } from './dtos/account-id.param.js';
import {
  AccountResponse,
  BalanceResponse,
  CreateAccountResponse,
  ErrorResponseDto,
} from './dtos/account-responses.js';
import { CreateAccountDto } from './dtos/create-account.dto.js';

@ApiTags('accounts')
@ApiDefaultResponse({ type: ErrorResponseDto, description: 'Erro padronizado' })
@Controller('accounts')
export class AccountsController {
  constructor(
    private readonly createAccount: CreateAccountUseCase,
    private readonly getAccount: GetAccountUseCase,
    private readonly getAccountBalance: GetAccountBalanceUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: CreateAccountResponse })
  create(@Body() body: CreateAccountDto): Promise<CreateAccountResponse> {
    return this.createAccount.execute(body);
  }

  @Get(':id')
  @ApiOkResponse({ type: AccountResponse })
  async get(@Param() { id }: AccountIdParam): Promise<AccountResponse> {
    const { account } = await this.getAccount.execute(id);
    const cpf = account.holder.cpf.value;
    return {
      id: account.id.toString(),
      fullName: account.holder.fullName,
      cpf: `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`,
      email: account.holder.email.value,
      balance: account.balance.amount,
      status: account.status,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt?.toISOString() ?? null,
    };
  }

  @Get(':id/balance')
  @ApiOkResponse({ type: BalanceResponse })
  balance(@Param() { id }: AccountIdParam): Promise<BalanceResponse> {
    return this.getAccountBalance.execute(id);
  }
}
