import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { GetTransactionsDto } from './dto/get-transactions.dto';

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a credit or debit transaction',
    description:
      'Updates the account balance and inserts the transaction atomically. ' +
      'Rejected if the account does not exist, the debit would overdraw the account, ' +
      'or the reference_id has already been used for this account.',
  })
  @ApiResponse({
    status: 201,
    description: 'Transaction created and balance updated',
    schema: {
      example: {
        success: true,
        data: {
          id: '07919881-a51d-49ad-b63d-1f302460a379',
          account_id: '43463094-b3b9-4233-a8ca-e2c82b2b01c0',
          type: 'credit',
          amount: 100,
          description: 'Deposit',
          reference_id: 'TXN001',
          created_at: '2026-10-27T14:59:44.000Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Validation error or insufficient balance for a debit',
  })
  @ApiNotFoundResponse({ description: 'Account does not exist' })
  @ApiConflictResponse({
    description:
      'reference_id already used for this account; no new transaction is created',
  })
  async create(@Body() dto: CreateTransactionDto) {
    const transaction = await this.transactionsService.create(dto);
    return {
      success: true,
      data: {
        id: transaction.id,
        account_id: transaction.account_id,
        type: transaction.type,
        amount: Number(transaction.amount),
        description: transaction.description,
        reference_id: transaction.reference_id,
        created_at: transaction.created_at,
      },
    };
  }

  @Get('account/:accountId')
  @ApiOperation({
    summary: 'Get transaction history for an account',
    description:
      'Supports filtering by type and pagination. Sorted latest-first.',
  })
  @ApiParam({ name: 'accountId', description: 'Account UUID' })
  @ApiResponse({
    status: 200,
    description: 'Transaction list with pagination metadata',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'da1a0842-580a-453f-b698-48b9a24a9bed',
            account_id: '43463094-b3b9-4233-a8ca-e2c82b2b01c0',
            type: 'debit',
            amount: 30,
            description: 'Purchase',
            reference_id: 'TXN002',
            created_at: '2026-10-27T14:59:44.000Z',
          },
        ],
        pagination: {
          current_page: 1,
          page_size: 10,
          total_records: 1,
          total_pages: 1,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'accountId is not a valid UUID, or page/limit/type is invalid',
  })
  @ApiNotFoundResponse({ description: 'Account not found' })
  async findAll(
    @Param('accountId', new ParseUUIDPipe({ version: '4' })) accountId: string,
    @Query() query: GetTransactionsDto,
  ) {
    const result = await this.transactionsService.findAll(accountId, query);
    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };
  }
}
