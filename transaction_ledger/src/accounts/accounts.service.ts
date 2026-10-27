import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../entities/account.entity';
import { CreateAccountDto } from './dto/create-account.dto';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
  ) {}

  async create(dto: CreateAccountDto): Promise<Account> {
    const account = this.accountRepository.create({
      name: dto.name,
      balance: 0,
    });
    return this.accountRepository.save(account);
  }

  async findOne(id: string): Promise<Account> {
    const account = await this.accountRepository.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException(`Account with id '${id}' not found`);
    }
    return account;
  }

  async getBalance(id: string): Promise<{ account_id: string; balance: number }> {
    const account = await this.findOne(id);
    return {
      account_id: account.id,
      balance: Number(account.balance),
    };
  }
}
