import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '../entities/account.entity';
import { Transaction } from '../entities/transaction.entity';
import { TransfersService } from './transfers.service';
import { TransfersController } from './transfers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Account, Transaction])],
  controllers: [TransfersController],
  providers: [TransfersService],
})
export class TransfersModule {}
