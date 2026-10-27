import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTransferDto {
  @ApiProperty({
    example: '43463094-b3b9-4233-a8ca-e2c82b2b01c0',
    description:
      'ID of the source account (money is debited from this account)',
  })
  @IsUUID('4', { message: 'from_account_id must be a valid UUID' })
  @IsNotEmpty({ message: 'from_account_id is required' })
  from_account_id: string;

  @ApiProperty({
    example: '579e8a78-716b-491d-94fe-9a1040ba8f0e',
    description:
      'ID of the destination account (money is credited to this account)',
  })
  @IsUUID('4', { message: 'to_account_id must be a valid UUID' })
  @IsNotEmpty({ message: 'to_account_id is required' })
  to_account_id: string;

  @ApiProperty({
    example: 30,
    description:
      'Amount to transfer, must be greater than 0 (max 2 decimal places)',
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Amount must be a number with at most 2 decimal places' },
  )
  @IsPositive({ message: 'Amount must be greater than 0' })
  amount: number;

  @ApiProperty({
    example: 'Payment for services',
    description: 'Description of the transfer',
  })
  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  description: string;

  @ApiProperty({
    example: 'TRANSFER001',
    description:
      'Unique reference ID for this transfer, checked on both accounts',
  })
  @IsString()
  @IsNotEmpty({ message: 'reference_id is required' })
  reference_id: string;
}
