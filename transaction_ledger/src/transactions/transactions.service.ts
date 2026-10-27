import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { Transaction, TransactionType } from '../entities/transaction.entity';
import { Account } from '../entities/account.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { GetTransactionsDto } from './dto/get-transactions.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateTransactionDto): Promise<Transaction> {
    return this.dataSource.transaction(async (manager) => {
      const accountExists = await manager.exists(Account, {
        where: { id: dto.account_id },
      });
      if (!accountExists) {
        throw new NotFoundException(
          `Account with id '${dto.account_id}' not found`,
        );
      }

      const existingTransaction = await manager.findOne(Transaction, {
        where: {
          account_id: dto.account_id,
          reference_id: dto.reference_id,
        },
      });
      if (existingTransaction) {
        throw this.duplicateConflict(existingTransaction);
      }

      // Atomic conditional update: the balance check and the write happen in
      // a single SQL statement, so there is no window between "read balance"
      // and "write balance" for a concurrent request to interleave a stale
      // read. This replaces app-level locking entirely.
      if (dto.type === TransactionType.DEBIT) {
        const result = await manager
          .createQueryBuilder()
          .update(Account)
          .set({ balance: () => 'balance - :amount' })
          .where('id = :id AND balance >= :amount', {
            id: dto.account_id,
            amount: dto.amount,
          })
          .execute();

        if (result.affected === 0) {
          const account = await manager.findOne(Account, {
            where: { id: dto.account_id },
          });
          throw new BadRequestException(
            `Insufficient balance. Current balance: ${Number(account.balance)}, attempted debit: ${dto.amount}`,
          );
        }
      } else {
        await manager
          .createQueryBuilder()
          .update(Account)
          .set({ balance: () => 'balance + :amount' })
          .where('id = :id', { id: dto.account_id })
          .setParameter('amount', dto.amount)
          .execute();
      }

      const transaction = manager.create(Transaction, {
        account_id: dto.account_id,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        reference_id: dto.reference_id,
      });

      try {
        return await manager.save(Transaction, transaction);
      } catch (error) {
        // Backstop for the check-then-insert race above: if two requests
        // with the same reference_id both pass the findOne check, the DB's
        // UNIQUE(account_id, reference_id) constraint rejects the second
        // INSERT. Translate that into the same 409 response.
        if (this.isDuplicateReferenceError(error)) {
          const existing = await manager.findOne(Transaction, {
            where: {
              account_id: dto.account_id,
              reference_id: dto.reference_id,
            },
          });
          if (existing) {
            throw this.duplicateConflict(existing);
          }
        }
        throw error;
      }
    });
  }

  private duplicateConflict(existing: Transaction): ConflictException {
    return new ConflictException({
      statusCode: 409,
      message: `Transaction with reference_id '${existing.reference_id}' already exists for this account`,
      error: 'Conflict',
      existing_transaction: {
        id: existing.id,
        reference_id: existing.reference_id,
        type: existing.type,
        amount: Number(existing.amount),
        created_at: existing.created_at,
      },
    });
  }

  private isDuplicateReferenceError(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      /UNIQUE constraint failed/i.test(error.message)
    );
  }

  async findAll(
    accountId: string,
    query: GetTransactionsDto,
  ): Promise<{
    data: Transaction[];
    pagination: {
      current_page: number;
      page_size: number;
      total_records: number;
      total_pages: number;
    };
  }> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId },
    });
    if (!account) {
      throw new NotFoundException(
        `Account with id '${accountId}' not found`,
      );
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { account_id: accountId };
    if (query.type) {
      where.type = query.type;
    }

    const [transactions, total] = await this.transactionRepository.findAndCount(
      {
        where,
        order: { created_at: 'DESC' },
        skip,
        take: limit,
      },
    );

    return {
      data: transactions.map((t) => ({
        ...t,
        amount: Number(t.amount),
      })),
      pagination: {
        current_page: page,
        page_size: limit,
        total_records: total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }
}
