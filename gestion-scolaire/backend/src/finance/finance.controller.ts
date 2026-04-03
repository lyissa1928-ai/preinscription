import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FinanceService } from './finance.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  FINANCE_PAYMENT_CREATE,
  FINANCE_PAYMENT_VALIDATE_REJECT,
  FINANCE_PAYMENT_READ,
  FINANCE_STATUT_READ,
  FINANCE_NON_EN_REGLE,
  FINANCE_RECOUVREMENT,
} from '../common/rbac.constants';

const CAN_READ_TARIFS = [
  'SCOLARITE',
  'ADMIN',
  'CAISSIER',
  'CHEF_COMPTABLE',
  'DAF',
  'DEPT_HEAD',
  'TEACHER',
  'STUDENT',
];
const CAN_WRITE_TARIFS = ['CHEF_COMPTABLE', 'ADMIN'];

@Controller('finance')
@UseGuards(AuthGuard('jwt'))
export class FinanceController {
  constructor(private service: FinanceService) {}

  @Get('fee-configs')
  @UseGuards(RolesGuard)
  @Roles(...CAN_READ_TARIFS)
  findFeeConfigs(
    @Query('formationId') formationId?: string,
    @Query('anneeUniv') anneeUniv?: string,
  ) {
    return this.service.findFeeConfigs(
      formationId,
      anneeUniv ? +anneeUniv : undefined,
    );
  }

  @Post('fee-configs')
  @UseGuards(RolesGuard)
  @Roles(...CAN_WRITE_TARIFS)
  upsertFeeConfig(
    @Body()
    body: {
      formationId: string;
      anneeUniv: number;
      fraisInscription?: number;
      mensualite?: number;
      nbMois?: number;
      fraisSoutenanceL3?: number;
      fraisSoutenanceM2?: number;
    },
  ) {
    return this.service.upsertFeeConfig(body);
  }

  @Get('payments')
  @UseGuards(RolesGuard)
  @Roles(...FINANCE_PAYMENT_READ)
  findAllPayments(
    @Query('personId') personId?: string,
    @Query('inscriptionId') inscriptionId?: string,
    @Query('statut') statut?: string,
  ) {
    return this.service.findAllPayments({ personId, inscriptionId, statut });
  }

  @Post('payments')
  @UseGuards(RolesGuard)
  @Roles(...FINANCE_PAYMENT_CREATE)
  createPayment(
    @CurrentUser() user: { sub: string },
    @Body()
    body: {
      personId: string;
      inscriptionId: string;
      montant: number;
      type: string;
      mois?: number;
      annee?: number;
    },
  ) {
    return this.service.createPayment(body, user.sub);
  }

  @Patch('payments/:id/validate')
  @UseGuards(RolesGuard)
  @Roles(...FINANCE_PAYMENT_VALIDATE_REJECT)
  validatePayment(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.service.validatePayment(id, user.sub);
  }

  @Patch('payments/:id/reject')
  @UseGuards(RolesGuard)
  @Roles(...FINANCE_PAYMENT_VALIDATE_REJECT)
  rejectPayment(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.service.rejectPayment(id, user.sub);
  }

  @Get('statut/:personId')
  @UseGuards(RolesGuard)
  @Roles(...FINANCE_STATUT_READ)
  getStatutFinancier(
    @Param('personId') personId: string,
    @Query('anneeUniv') anneeUniv?: string,
  ) {
    return this.service.getStatutFinancier(
      personId,
      anneeUniv ? +anneeUniv : new Date().getFullYear(),
    );
  }

  @Get('non-en-regle')
  @UseGuards(RolesGuard)
  @Roles(...FINANCE_NON_EN_REGLE)
  getEtudiantsNonEnRegle(@Query('anneeUniv') anneeUniv?: string) {
    return this.service.getEtudiantsNonEnRegle(
      anneeUniv ? +anneeUniv : undefined,
    );
  }

  @Get('recouvrement')
  @UseGuards(RolesGuard)
  @Roles(...FINANCE_RECOUVREMENT)
  getRecouvrementParFormationEtCohorte(@Query('anneeUniv') anneeUniv?: string) {
    return this.service.getRecouvrementParFormationEtCohorte(
      anneeUniv ? +anneeUniv : undefined,
    );
  }
}
