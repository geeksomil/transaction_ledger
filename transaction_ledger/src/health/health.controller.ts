import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiServiceUnavailableResponse } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Check API and database health' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      example: {
        success: true,
        status: 'ok',
        uptime: 12.345,
        timestamp: '2026-10-27T15:00:00.000Z',
        database: 'up',
      },
    },
  })
  @ApiServiceUnavailableResponse({
    description: 'Database is unreachable',
  })
  async check() {
    let databaseStatus: 'up' | 'down' = 'down';

    try {
      await this.dataSource.query('SELECT 1');
      databaseStatus = 'up';
    } catch {
      databaseStatus = 'down';
    }

    if (databaseStatus === 'down') {
      throw new ServiceUnavailableException({
        success: false,
        status: 'error',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: databaseStatus,
      });
    }

    return {
      success: true,
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: databaseStatus,
    };
  }
}
