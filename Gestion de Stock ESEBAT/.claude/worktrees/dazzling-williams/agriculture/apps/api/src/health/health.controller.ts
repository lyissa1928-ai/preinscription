import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
@Public()
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check' })
  check() {
    return {
      status: 'ok',
      version: process.env.npm_package_version || '0.1.0',
      env: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    };
  }
}
