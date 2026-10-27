import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { Account } from '../entities/account.entity';
import { Transaction, TransactionType } from '../entities/transaction.entity';
import { CreateTransferDto } from './dto/create-transfer.dto';

@Injectable()
export class TransfersService {
  constructor(private readonly dataSource: DataSource) {}

  async transfer(dto: CreateTransferDto) {
    if (dto.from_account_id === dto.to_account_id) {
      throw new BadRequestException('Cannot transfer to the same account');
    }

    return this.dataSource.transaction(async (manager) => {
      const fromExists = await manager.exists(Account, {
        where: { id: dto.from_account_id },
      });
      if (!fromExists) {
        throw new NotFoundException(
          `Source account with id '${dto.from_account_id}' not found`,
        );
      }

      const toExists = await manager.exists(Account, {
        where: { id: dto.to_account_id },
      });
      if (!toExists) {
        throw new NotFoundException(
          `Destination account with id '${dto.to_account_id}' not found`,
        );
      }

      const existingDebit = await manager.findOne(Transaction, {
        where: {
          account_id: dto.from_account_id,
          reference_id: dto.reference_id,
        },
      });
      if (existingDebit) {
        throw new ConflictException(
          `Transaction with reference_id '${dto.reference_id}' already exists for source account`,
        );
      }

      const existingCredit = await manager.findOne(Transaction, {
        where: {
          account_id: dto.to_account_id,
          reference_id: dto.reference_id,
        },
      });
      if (existingCredit) {
        throw new ConflictException(
          `Transaction with reference_id '${dto.reference_id}' already exists for destination account`,
        );
      }

      // Atomic conditional debit: the balance check and the write happen in
      // a single SQL statement (no read-then-write gap for a concurrent
      // request to race against), so no application-level lock is needed.
      const debitResult = await manager
        .createQueryBuilder()
        .update(Account)
        .set({ balance: () => 'balance - :amount' })
        .where('id = :id AND balance >= :amount', {
          id: dto.from_account_id,
          amount: dto.amount,
        })
        .execute();

      if (debitResult.affected === 0) {
        const fromAccount = await manager.findOne(Account, {
          where: { id: dto.from_account_id },
        });
        throw new BadRequestException(
          `Insufficient balance in source account. Current balance: ${Number(fromAccount.balance)}, attempted transfer: ${dto.amount}`,
        );
      }

      await manager
        .createQueryBuilder()
        .update(Account)
        .set({ balance: () => 'balance + :amount' })
        .where('id = :id', { id: dto.to_account_id })
        .setParameter('amount', dto.amount)
        .execute();

      const debitTx = manager.create(Transaction, {
        account_id: dto.from_account_id,
        type: TransactionType.DEBIT,
        amount: dto.amount,
        description: `Transfer to ${dto.to_account_id}: ${dto.description}`,
        reference_id: dto.reference_id,
      });

      const creditTx = manager.create(Transaction, {
        account_id: dto.to_account_id,
        type: TransactionType.CREDIT,
        amount: dto.amount,
        description: `Transfer from ${dto.from_account_id}: ${dto.description}`,
        reference_id: dto.reference_id,
      });

      let savedDebit: Transaction;
      let savedCredit: Transaction;
      try {
        savedDebit = await manager.save(Transaction, debitTx);
        savedCredit = await manager.save(Transaction, creditTx);
      } catch (error) {
        if (this.isDuplicateReferenceError(error)) {
          throw new ConflictException(
            `Transaction with reference_id '${dto.reference_id}' already exists on one of the accounts`,
          );
        }
        throw error;
      }

      const [fromAccount, toAccount] = await Promise.all([
        manager.findOne(Account, { where: { id: dto.from_account_id } }),
        manager.findOne(Account, { where: { id: dto.to_account_id } }),
      ]);

      return {
        from_account: {
          id: fromAccount.id,
          balance: Number(fromAccount.balance),
        },
        to_account: {
          id: toAccount.id,
          balance: Number(toAccount.balance),
        },
        debit_transaction: {
          id: savedDebit.id,
          amount: Number(savedDebit.amount),
          reference_id: savedDebit.reference_id,
        },
        credit_transaction: {
          id: savedCredit.id,
          amount: Number(savedCredit.amount),
          reference_id: savedCredit.reference_id,
        },
      };
    });
  }

  private isDuplicateReferenceError(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      /UNIQUE constraint failed/i.test(error.message)
    );
  }
}
