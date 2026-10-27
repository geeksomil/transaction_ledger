import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Account } from '../entities/account.entity';
import { Transaction } from '../entities/transaction.entity';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'better-sqlite3',
  database: configService.get<string>('DATABASE_PATH', 'database.sqlite'),
  entities: [Account, Transaction],
  synchronize: true,
  logging: false,
});
