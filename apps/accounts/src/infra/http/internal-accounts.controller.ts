import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiDefaultResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CreditAccountUseCase } from '@accounts/application/use-cases/credit-account.use-case';
import { DebitAccountUseCase } from '@accounts/application/use-cases/debit-account.use-case';
import { AccountIdParam } from './dtos/account-id.param.js';
import { ErrorResponseDto } from './dtos/account-responses.js';
import { ChangeBalanceDto } from './dtos/change-balance.dto.js';

/** Endpoints consumidos pelo serviço `transactions`. */
@ApiTags('internal')
@ApiDefaultResponse({ type: ErrorResponseDto, description: 'Erro padronizado' })
@Controller('internal/accounts')
export class InternalAccountsController {
  constructor(
    private readonly creditAccount: CreditAccountUseCase,
    private readonly debitAccount: DebitAccountUseCase,
  ) {}

  @Post(':id/credit')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: { properties: { balance: { type: 'number' } } } })
  credit(@Param() { id }: AccountIdParam, @Body() { amount }: ChangeBalanceDto) {
    return this.creditAccount.execute({ accountId: id, amount });
  }

  @Post(':id/debit')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: { properties: { balance: { type: 'number' } } } })
  debit(@Param() { id }: AccountIdParam, @Body() { amount }: ChangeBalanceDto) {
    return this.debitAccount.execute({ accountId: id, amount });
  }
}
