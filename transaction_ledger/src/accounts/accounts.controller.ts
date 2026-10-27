import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';

@ApiTags('Accounts')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new account with a 0 initial balance' })
  @ApiResponse({
    status: 201,
    description: 'Account created',
    schema: {
      example: {
        success: true,
        data: {
          id: '43463094-b3b9-4233-a8ca-e2c82b2b01c0',
          name: 'John Doe',
          balance: 0,
          created_at: '2026-10-27T14:58:06.000Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Validation failed (missing name, or client tried to set balance/id)',
  })
  async create(@Body() dto: CreateAccountDto) {
    const account = await this.accountsService.create(dto);
    return {
      success: true,
      data: {
        id: account.id,
        name: account.name,
        balance: Number(account.balance),
        created_at: account.created_at,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get account details by ID' })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  @ApiResponse({
    status: 200,
    description: 'Account found',
    schema: {
      example: {
        success: true,
        data: {
          id: '43463094-b3b9-4233-a8ca-e2c82b2b01c0',
          name: 'John Doe',
          balance: 120,
          created_at: '2026-10-27T14:58:06.000Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'id is not a valid UUID' })
  @ApiNotFoundResponse({ description: 'Account not found' })
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    const account = await this.accountsService.findOne(id);
    return {
      success: true,
      data: {
        id: account.id,
        name: account.name,
        balance: Number(account.balance),
        created_at: account.created_at,
      },
    };
  }

  @Get(':id/balance')
  @ApiOperation({ summary: 'Get the current balance of an account' })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  @ApiResponse({
    status: 200,
    description: 'Balance returned',
    schema: {
      example: {
        success: true,
        data: {
          account_id: '43463094-b3b9-4233-a8ca-e2c82b2b01c0',
          balance: 120,
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'id is not a valid UUID' })
  @ApiNotFoundResponse({ description: 'Account not found' })
  async getBalance(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const balance = await this.accountsService.getBalance(id);
    return {
      success: true,
      data: balance,
    };
  }
}
