import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@agriculture/shared';
import { AdminStatsService } from './admin-stats.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminStats: AdminStatsService) {}

  @Get()
  @ApiOperation({ summary: 'Zone admin - ADMIN uniquement' })
  index() {
    return { message: 'Bienvenue dans la zone admin', role: 'ADMIN' };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques globales' })
  getStats() {
    return this.adminStats.getStats();
  }
}
