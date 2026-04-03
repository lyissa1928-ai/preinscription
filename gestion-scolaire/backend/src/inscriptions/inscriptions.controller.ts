import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { InscriptionsService } from './inscriptions.service';

const CAN_READ = [
  'SCOLARITE',
  'SERVICE_PEDAGOGIQUE',
  'RESPONSABLE_PEDAGOGIQUE',
  'ADMIN',
  'SUPER_ADMIN',
  'DEPT_HEAD',
];
const SCOLARITE_ADMIN = ['SCOLARITE', 'ADMIN', 'SUPER_ADMIN'];
/** Admin et responsable pédagogique : même privilège pour campus, classes (cohortes) et activités pédagogiques. */
const PEDAGOGIE_ADMIN = [
  'SERVICE_PEDAGOGIQUE',
  'RESPONSABLE_PEDAGOGIQUE',
  'ADMIN',
  'SUPER_ADMIN',
];

@Controller('inscriptions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(...CAN_READ)
export class InscriptionsController {
  constructor(private service: InscriptionsService) {}

  @Get('cohorts/template')
  @Roles(...PEDAGOGIE_ADMIN)
  getCohortsTemplate(@Res({ passthrough: false }) res: Response) {
    const buffer = this.service.getCohortsTemplateExcel();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=template-classes.xlsx',
    );
    res.send(buffer);
  }

  @Post('cohorts/bulk')
  @Roles(...PEDAGOGIE_ADMIN)
  bulkCreateCohorts(
    @Body()
    body: {
      items: Array<{
        formationCode: string;
        annee: number;
        nom: string;
        section?: string;
      }>;
    },
  ) {
    return this.service.bulkCreateCohorts(body.items);
  }

  @Patch('cohorts/bulk')
  @Roles(...PEDAGOGIE_ADMIN)
  bulkUpdateCohorts(
    @Body()
    body: {
      items: Array<{
        id: string;
        nom?: string;
        section?: string;
        formationId?: string;
        annee?: number;
      }>;
    },
  ) {
    return this.service.bulkUpdateCohorts(body.items);
  }

  @Delete('cohorts/bulk')
  @Roles(...PEDAGOGIE_ADMIN)
  bulkDeleteCohorts(@Body() body: { ids: string[] }) {
    return this.service.bulkDeleteCohorts(body.ids ?? []);
  }

  @Get('cohorts')
  findCohorts(
    @Query('formationId') formationId?: string,
    @Query('annee') annee?: string,
    @Query('campusId') campusId?: string,
  ) {
    return this.service.findCohorts(
      formationId,
      annee ? +annee : undefined,
      campusId,
    );
  }

  @Post('cohorts')
  @Roles(...PEDAGOGIE_ADMIN)
  createCohort(
    @Body()
    body: {
      nom: string;
      section?: string;
      formationId: string;
      campusId?: string | null;
      annee: number;
      effectifMax?: number;
    },
  ) {
    return this.service.createCohort(body);
  }

  @Patch('cohorts/:id')
  @Roles(...PEDAGOGIE_ADMIN)
  updateCohort(
    @Param('id') id: string,
    @Body()
    body: {
      nom?: string;
      section?: string;
      formationId?: string;
      campusId?: string | null;
      annee?: number;
      effectifMax?: number;
    },
  ) {
    return this.service.updateCohort(id, body);
  }

  @Delete('cohorts/:id')
  @Roles(...PEDAGOGIE_ADMIN)
  deleteCohort(@Param('id') id: string) {
    return this.service.deleteCohort(id);
  }

  @Post('close')
  @Roles(...SCOLARITE_ADMIN)
  closeInscriptions(
    @Body() body: { anneeUniv: number; formationId?: string },
    @CurrentUser() user: { sub: string },
  ) {
    return this.service.closeInscriptions(
      body.anneeUniv,
      body.formationId,
      user.sub,
    );
  }

  @Post('bulk-assign')
  @Roles(...PEDAGOGIE_ADMIN)
  bulkAssignToCohort(
    @Body()
    body: {
      cohortId: string;
      inscriptionIds?: string[];
      numeroCartes?: string[];
    },
    @CurrentUser() user: { sub: string },
  ) {
    return this.service.bulkAssignToCohort(body, user.sub);
  }

  @Get()
  findAll(
    @Query('formationId') formationId?: string,
    @Query('cohortId') cohortId?: string,
    @Query('anneeUniv') anneeUniv?: string,
    @Query('statut') statut?: string,
  ) {
    return this.service.findAll({
      formationId,
      cohortId,
      anneeUniv: anneeUniv ? +anneeUniv : undefined,
      statut,
    });
  }

  @Get('person/:personId')
  findByPerson(@Param('personId') personId: string) {
    return this.service.findByPerson(personId);
  }

  @Post()
  @Roles(...SCOLARITE_ADMIN)
  create(
    @Body()
    body: {
      personId: string;
      formationId: string;
      maquetteId: string;
      semestreId: string;
      cohortId?: string;
      anneeUniv: number;
    },
  ) {
    return this.service.createInscription(body);
  }

  @Patch(':id/statut')
  @Roles(...SCOLARITE_ADMIN)
  updateStatut(
    @Param('id') id: string,
    @Body()
    body: {
      statut: 'INSCRIT' | 'VALIDE' | 'PROVISOIRE' | 'CONFIRMEE' | 'ANNULEE';
    },
    @CurrentUser() user: { sub: string },
  ) {
    return this.service.updateStatut(id, body.statut, user.sub);
  }

  @Patch(':id/annuler')
  @Roles(...SCOLARITE_ADMIN)
  annuler(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.service.annuler(id, user.sub);
  }
}
