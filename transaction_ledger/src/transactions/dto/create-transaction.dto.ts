import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TransactionType } from '../../entities/transaction.entity';

export class CreateTransactionDto {
  @ApiProperty({
    example: '43463094-b3b9-4233-a8ca-e2c82b2b01c0',
    description: 'ID of the account to apply the transaction to',
  })
  @IsUUID('4', { message: 'account_id must be a valid UUID' })
  @IsNotEmpty({ message: 'account_id is required' })
  account_id: string;

  @ApiProperty({
    enum: TransactionType,
    example: TransactionType.CREDIT,
    description: 'Type of transaction',
  })
  @IsEnum(TransactionType, {
    message: 'Transaction type must be either "credit" or "debit"',
  })
  @IsNotEmpty({ message: 'Transaction type is required' })
  type: TransactionType;

  @ApiProperty({
    example: 100,
    description:
      'Transaction amount, must be greater than 0 (max 2 decimal places)',
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Amount must be a number with at most 2 decimal places' },
  )
  @IsPositive({ message: 'Amount must be greater than 0' })
  amount: number;

  @ApiProperty({
    example: 'Salary deposit',
    description: 'Description of the transaction',
  })
  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  description: string;

  @ApiProperty({
    example: 'TXN001',
    description: 'Unique reference ID for this transaction within the account',
  })
  @IsString()
  @IsNotEmpty({ message: 'reference_id is required' })
  reference_id: string;
}
