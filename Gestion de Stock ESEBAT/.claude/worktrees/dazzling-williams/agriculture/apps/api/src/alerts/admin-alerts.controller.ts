import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@agriculture/shared';
import { AlertsService } from './alerts.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminAlertsController {
  constructor(private readonly service: AlertsService) {}

  @Post('run-now')
  @ApiOperation({ summary: 'Forcer évaluation (debug)' })
  async runNow() {
    return this.service.runNow();
  }
}
