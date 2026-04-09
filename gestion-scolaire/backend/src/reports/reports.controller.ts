import {
  Controller,
  Get,
  Header,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

const PEDAGOGIE_OR_ADMIN = [
  'SERVICE_PEDAGOGIQUE',
  'RESPONSABLE_PEDAGOGIQUE',
  'AGENT_PEDAGOGIQUE',
  'ADMIN',
  'SUPER_ADMIN',
];
const FINANCE_REPORTS = ['ADMIN', 'SUPER_ADMIN', 'CHEF_COMPTABLE', 'DAF'];

@Controller('reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(...PEDAGOGIE_OR_ADMIN, ...FINANCE_REPORTS)
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('pedagogy/dashboard')
  @Roles(...PEDAGOGIE_OR_ADMIN)
  getPedagogyDashboard(
    @Query('anneeUniv') anneeUniv?: string,
    @CurrentUser() user?: { sub: string; role: string },
  ) {
    return this.service.getPedagogyDashboard(
      anneeUniv ? +anneeUniv : undefined,
      user?.sub,
      user?.role,
    );
  }

  @Get('effectifs')
  @Roles(...FINANCE_REPORTS)
  getEffectifs(@Query('anneeUniv') anneeUniv?: string) {
    return this.service.getEffectifs(anneeUniv ? +anneeUniv : undefined);
  }

  @Get('recettes')
  @Roles(...FINANCE_REPORTS)
  getRecettes(@Query('annee') annee?: string) {
    return this.service.getRecettes(annee ? +annee : undefined);
  }

  @Get('taux-reussite')
  @Roles(...FINANCE_REPORTS)
  getTauxReussite(
    @Query('anneeUniv') anneeUniv?: string,
    @Query('session') session?: string,
  ) {
    return this.service.getTauxReussite(
      anneeUniv ? +anneeUniv : undefined,
      session ? +session : undefined,
    );
  }

  @Get('synthese')
  @Roles(...FINANCE_REPORTS)
  getSynthese(@Query('anneeUniv') anneeUniv?: string) {
    return this.service.getSynthese(anneeUniv ? +anneeUniv : undefined);
  }

  @Get('export/pdf')
  @Roles(...FINANCE_REPORTS)
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="rapport-synthese.pdf"')
  async exportPdf(
    @Query('anneeUniv') anneeUniv?: string,
  ): Promise<StreamableFile> {
    const pdf = await this.service.exportPdf(
      anneeUniv ? +anneeUniv : undefined,
    );
    return new StreamableFile(pdf);
  }

  @Get('export/csv')
  @Roles(...FINANCE_REPORTS)
  async exportExcel(
    @Res({ passthrough: false }) res: Response,
    @Query('anneeUniv') anneeUniv?: string,
  ): Promise<void> {
    const buffer = await this.service.exportExcel(
      anneeUniv ? +anneeUniv : undefined,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="rapport-synthese.xlsx"',
    );
    res.send(buffer);
  }
}
