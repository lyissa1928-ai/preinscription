import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import * as express from 'express';
import { AuthGuard } from '@nestjs/passport';
import { GovernanceService } from './governance.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

const CAN_VIEW = ['CAISSIER', 'CHEF_COMPTABLE', 'DAF', 'ADMIN'];
const CAN_MODIFY = ['CAISSIER', 'CHEF_COMPTABLE', 'ADMIN'];
const CAN_CLOSE = ['CHEF_COMPTABLE', 'DAF', 'ADMIN'];

@Controller('governance')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(...CAN_VIEW)
export class GovernanceController {
  constructor(private service: GovernanceService) {}

  @Get('financial-status')
  getOrCreateDailyStatus(@Query('date') date: string) {
    const d = date ? new Date(date) : new Date();
    return this.service.getOrCreateDailyStatus(d);
  }

  @Patch('financial-status')
  @UseGuards(RolesGuard)
  @Roles(...CAN_MODIFY)
  updateDailyStatus(
    @Query('date') date: string,
    @Body() body: { totalDepenses?: number },
    @CurrentUser() user: { sub: string },
  ) {
    const d = date ? new Date(date) : new Date();
    return this.service.updateDailyStatus(d, body, user.sub);
  }

  @Post('financial-status/validate')
  @UseGuards(RolesGuard)
  @Roles(...CAN_CLOSE)
  validateAndTransmit(
    @Body() body: { date: string },
    @CurrentUser() user: { sub: string },
  ) {
    const d = body.date ? new Date(body.date) : new Date();
    return this.service.validateAndTransmit(d, user.sub);
  }

  @Post('breach-requests')
  @UseGuards(RolesGuard)
  @Roles('CHEF_COMPTABLE', 'ADMIN')
  createBreachRequest(
    @Body() body: { financialStatusId: string; justification: string },
    @CurrentUser() user: { sub: string },
  ) {
    return this.service.createBreachRequest(
      body.financialStatusId,
      body.justification,
      user.sub,
    );
  }

  @Patch('breach-requests/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('CHEF_COMPTABLE', 'DAF', 'ADMIN')
  approveBreach(
    @Param('id') id: string,
    @Body() body: { commentaire?: string },
    @CurrentUser() user: { sub: string },
  ) {
    return this.service.approveBreach(id, user.sub, body.commentaire);
  }

  @Patch('breach-requests/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('CHEF_COMPTABLE', 'DAF', 'ADMIN')
  rejectBreach(
    @Param('id') id: string,
    @Body() body: { commentaire?: string },
    @CurrentUser() user: { sub: string },
  ) {
    return this.service.rejectBreach(id, user.sub, body.commentaire);
  }

  @Get('financial-statuses')
  @UseGuards(RolesGuard)
  @Roles(...CAN_VIEW)
  findFinancialStatuses(
    @Query('dateDebut') dateDebut?: string,
    @Query('dateFin') dateFin?: string,
  ) {
    return this.service.findFinancialStatuses({
      dateDebut: dateDebut ? new Date(dateDebut) : undefined,
      dateFin: dateFin ? new Date(dateFin) : undefined,
    });
  }

  @Get('breach-requests')
  @UseGuards(RolesGuard)
  @Roles(...CAN_VIEW)
  findBreachRequests(@Query('statut') statut?: string) {
    return this.service.findBreachRequests(statut ? { statut } : undefined);
  }

  @Get('breach-requests/pending')
  @UseGuards(RolesGuard)
  @Roles(...CAN_VIEW)
  getPendingBreaches() {
    return this.service.getPendingBreaches();
  }

  @Get('financial-statuses/export/csv')
  @UseGuards(RolesGuard)
  @Roles(...CAN_VIEW)
  async exportFinancialStatusesExcel(
    @Res() res: express.Response,
    @Query('dateDebut') dateDebut?: string,
    @Query('dateFin') dateFin?: string,
  ) {
    const buffer = await this.service.exportFinancialStatusesExcel({
      dateDebut: dateDebut ? new Date(dateDebut) : undefined,
      dateFin: dateFin ? new Date(dateFin) : undefined,
    });
    const filename = `etats-financiers-${dateDebut || 'debut'}-${dateFin || 'fin'}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
