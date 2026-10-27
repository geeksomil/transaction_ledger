import { Controller, Post, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { TransfersService } from './transfers.service';
import { CreateTransferDto } from './dto/create-transfer.dto';

@ApiTags('Transfers')
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  @ApiOperation({
    summary: 'Transfer funds between two accounts',
    description:
      'Creates a debit on the source account and a credit on the destination account ' +
      'in a single atomic database transaction. Either both succeed or neither is applied.',
  })
  @ApiResponse({
    status: 201,
    description: 'Transfer completed',
    schema: {
      example: {
        success: true,
        message: 'Transfer completed successfully',
        data: {
          from_account: {
            id: '43463094-b3b9-4233-a8ca-e2c82b2b01c0',
            balance: 70,
          },
          to_account: {
            id: '579e8a78-716b-491d-94fe-9a1040ba8f0e',
            balance: 230,
          },
          debit_transaction: {
            id: '7000da45-7fb5-4353-9ea1-3f346000629e',
            amount: 30,
            reference_id: 'TRANSFER001',
          },
          credit_transaction: {
            id: 'd1023de2-8d5d-4dcf-b0a7-c9d70be4f088',
            amount: 30,
            reference_id: 'TRANSFER001',
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Validation error, same-account transfer, or insufficient balance',
  })
  @ApiNotFoundResponse({
    description: 'Source or destination account not found',
  })
  @ApiConflictResponse({
    description: 'reference_id already used on either account',
  })
  async transfer(@Body() dto: CreateTransferDto) {
    const result = await this.transfersService.transfer(dto);
    return {
      success: true,
      message: 'Transfer completed successfully',
      data: result,
    };
  }
}
