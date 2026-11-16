import { Controller, Get } from '@nestjs/common';

@Controller()
export class AccountsController {
  @Get()
  getHello(): string {
    return 'Hello World!';
  }
}
