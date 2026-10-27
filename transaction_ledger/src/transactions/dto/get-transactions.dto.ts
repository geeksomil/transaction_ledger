import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '../../entities/transaction.entity';

export class GetTransactionsDto {
  @ApiPropertyOptional({
    enum: TransactionType,
    description:
      'Filter by transaction type. Omit to return both credit and debit.',
  })
  @IsOptional()
  @IsEnum(TransactionType, {
    message: 'type must be either "credit" or "debit"',
  })
  type?: TransactionType;

  @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Page number' })
  @IsOptional()
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    default: 10,
    minimum: 1,
    description: 'Items per page',
  })
  @IsOptional()
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  limit?: number = 10;
}
