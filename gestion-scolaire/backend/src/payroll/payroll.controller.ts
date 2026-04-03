import {
  Controller,
  Get,
  Header,
  Param,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PayrollService } from './payroll.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  PAYROLL_WRITE,
  PAYROLL_READ,
  PAYROLL_ME,
  PAYROLL_BULLETIN_ADMIN,
} from '../common/rbac.constants';

@Controller('payroll')
@UseGuards(AuthGuard('jwt'))
export class PayrollController {
  constructor(private service: PayrollService) {}

  @Get('preview')
  @UseGuards(RolesGuard)
  @Roles(...PAYROLL_WRITE)
  calculatePreview(@Query('mois') mois: string, @Query('annee') annee: string) {
    const m = mois ? +mois : new Date().getMonth() + 1;
    const a = annee ? +annee : new Date().getFullYear();
    return this.service.calculatePreview(m, a);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...PAYROLL_READ)
  findAll(
    @Query('personId') personId?: string,
    @Query('mois') mois?: string,
    @Query('annee') annee?: string,
  ) {
    return this.service.findAll({
      personId,
      mois: mois ? +mois : undefined,
      annee: annee ? +annee : undefined,
    });
  }

  @Get('me')
  @UseGuards(RolesGuard)
  @Roles(...PAYROLL_ME)
  getMyPayrolls(
    @CurrentUser() user: { sub: string },
    @Query('mois') mois?: string,
    @Query('annee') annee?: string,
  ) {
    return this.service.getMyPayrolls(
      user.sub,
      mois ? +mois : undefined,
      annee ? +annee : undefined,
    );
  }

  @Get('calculate')
  @UseGuards(RolesGuard)
  @Roles(...PAYROLL_WRITE)
  calculateAndSave(@Query('mois') mois: string, @Query('annee') annee: string) {
    const m = mois ? +mois : new Date().getMonth() + 1;
    const a = annee ? +annee : new Date().getFullYear();
    return this.service.calculateAndSave(m, a);
  }

  @Get('generate')
  @UseGuards(RolesGuard)
  @Roles(...PAYROLL_WRITE)
  generateBulletins(
    @Query('mois') mois: string,
    @Query('annee') annee: string,
  ) {
    const m = mois ? +mois : new Date().getMonth() + 1;
    const a = annee ? +annee : new Date().getFullYear();
    return this.service.generateBulletins(m, a);
  }

  @Get('me/bulletin/:payrollId')
  @UseGuards(RolesGuard)
  @Roles(...PAYROLL_ME)
  @Header('Content-Type', 'application/pdf')
  async downloadMyBulletin(
    @CurrentUser() user: { sub: string },
    @Param('payrollId') payrollId: string,
  ): Promise<StreamableFile> {
    const pdf = await this.service.downloadBulletin(user.sub, payrollId);
    return new StreamableFile(pdf, {
      disposition: `attachment; filename="bulletin-${payrollId}.pdf"`,
    });
  }

  @Get('bulletin/:payrollId')
  @UseGuards(RolesGuard)
  @Roles(...PAYROLL_BULLETIN_ADMIN)
  @Header('Content-Type', 'application/pdf')
  async downloadBulletinAdmin(
    @Param('payrollId') payrollId: string,
  ): Promise<StreamableFile> {
    const pdf = await this.service.downloadBulletinAdmin(payrollId);
    return new StreamableFile(pdf, {
      disposition: `attachment; filename="bulletin-${payrollId}.pdf"`,
    });
  }
}
