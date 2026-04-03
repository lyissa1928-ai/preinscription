import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { AuditService } from './audit.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('audit')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('AUDITOR', 'ADMIN', 'SUPER_ADMIN')
export class AuditController {
  constructor(private service: AuditService) {}

  @Get('logs')
  findLogs(
    @Query('dateDebut') dateDebut?: string,
    @Query('dateFin') dateFin?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.service.findMany({
      dateDebut: dateDebut ? new Date(dateDebut) : undefined,
      dateFin: dateFin ? new Date(dateFin) : undefined,
      userId,
      action,
      entityType,
      limit: limit ? +limit : undefined,
      offset: offset ? +offset : undefined,
    });
  }

  @Get('export')
  async exportExcel(
    @Res({ passthrough: false }) res: Response,
    @Query('dateDebut') dateDebut?: string,
    @Query('dateFin') dateFin?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
  ): Promise<void> {
    const buffer = await this.service.exportExcel({
      dateDebut: dateDebut ? new Date(dateDebut) : undefined,
      dateFin: dateFin ? new Date(dateFin) : undefined,
      userId,
      action,
      entityType,
    });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="journal-audit.xlsx"',
    );
    res.send(buffer);
  }
}
