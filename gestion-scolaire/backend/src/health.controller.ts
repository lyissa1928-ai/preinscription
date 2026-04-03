import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async check() {
    let db = 'unknown';
    try {
      await this.prisma.$connect();
      db = 'connected';
    } catch {
      db = 'error';
    }
    return {
      status: db === 'connected' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database: db,
    };
  }
}
