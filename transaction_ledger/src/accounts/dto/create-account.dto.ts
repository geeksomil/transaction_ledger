import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAccountDto {
  @ApiProperty({ example: 'John Doe', description: 'Account holder name' })
  @IsString()
  @IsNotEmpty({ message: 'Account name is required' })
  name: string;
}
