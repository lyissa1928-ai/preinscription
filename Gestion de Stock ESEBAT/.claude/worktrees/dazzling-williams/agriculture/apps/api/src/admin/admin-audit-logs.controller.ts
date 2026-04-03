import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@agriculture/shared';
import { AdminAuditLogsService } from './admin-audit-logs.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminAuditLogsController {
  constructor(private readonly service: AdminAuditLogsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des logs audit (paginé)' })
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('actorId') actorId?: string,
    @Query('entity') entity?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.list({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      actorId,
      entity,
      action,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }
}
