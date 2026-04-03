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
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { GradesService } from './grades.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import {
  GRADES_READ,
  GRADES_WRITE,
  GRADES_SESSION_CONFIG,
  GRADES_APPROVE_REJECT,
  GRADES_MODIFICATION_READ,
  GRADES_MY_ECS,
  GRADES_ME,
  GRADES_EC_READ,
} from '../common/rbac.constants';

@Controller('grades')
@UseGuards(AuthGuard('jwt'))
export class GradesController {
  constructor(
    private service: GradesService,
    private prisma: PrismaService,
  ) {}

  @Get('session-configs')
  @UseGuards(RolesGuard)
  @Roles(...GRADES_READ)
  getSessionConfigs(@Query('anneeUniv') anneeUniv?: string) {
    return this.service.getSessionConfigs(anneeUniv ? +anneeUniv : undefined);
  }

  @Post('session-configs')
  @UseGuards(RolesGuard)
  @Roles(...GRADES_SESSION_CONFIG)
  upsertSessionConfig(
    @Body()
    body: {
      anneeUniv: number;
      session: number;
      dateLimite: string;
      verrouilleJury?: boolean;
    },
  ) {
    return this.service.upsertSessionConfig({
      ...body,
      dateLimite: new Date(body.dateLimite),
    });
  }

  @Get('my-ecs')
  @UseGuards(RolesGuard)
  @Roles(...GRADES_MY_ECS)
  getMyECs(
    @CurrentUser() user: { sub: string },
    @Query('anneeUniv') anneeUniv: string,
  ) {
    return this.service.getTeacherECs(
      user.sub,
      anneeUniv ? +anneeUniv : new Date().getFullYear(),
    );
  }

  /** Cohortes où l’enseignant a au moins un cours (année universitaire). */
  @Get('my-cohorts')
  @UseGuards(RolesGuard)
  @Roles(...GRADES_MY_ECS)
  getMyCohorts(
    @CurrentUser() user: { sub: string },
    @Query('anneeUniv') anneeUniv: string,
  ) {
    return this.service.getTeacherCohorts(
      user.sub,
      anneeUniv ? +anneeUniv : new Date().getFullYear(),
    );
  }

  @Get('cohort/:cohortId/roll')
  @UseGuards(RolesGuard)
  @Roles(...GRADES_EC_READ)
  getClassRoll(
    @CurrentUser() user: { sub: string; role: string },
    @Param('cohortId') cohortId: string,
    @Query('anneeUniv') anneeUniv: string,
    @Query('date') date: string,
  ) {
    return this.service.getClassRollSheet(
      user.sub,
      user.role,
      cohortId,
      +anneeUniv,
      date,
    );
  }

  @Post('cohort/:cohortId/roll')
  @UseGuards(RolesGuard)
  @Roles(...GRADES_WRITE)
  saveClassRoll(
    @CurrentUser() user: { sub: string; role: string },
    @Param('cohortId') cohortId: string,
    @Body()
    body: {
      anneeUniv: number;
      date: string;
      entries: { personId: string; status: string; comment?: string | null }[];
    },
  ) {
    return this.service.saveClassRollBatch(
      user.sub,
      user.role,
      cohortId,
      body.anneeUniv,
      body.date,
      body.entries ?? [],
    );
  }

  /** Présence hebdomadaire (lundi–vendredi) pour une classe / cohorte. */
  @Get('cohort/:cohortId/roll-week')
  @UseGuards(RolesGuard)
  @Roles(...GRADES_EC_READ)
  getClassRollWeek(
    @CurrentUser() user: { sub: string; role: string },
    @Param('cohortId') cohortId: string,
    @Query('anneeUniv') anneeUniv: string,
    @Query('weekStart') weekStart: string,
  ) {
    return this.service.getClassRollWeek(
      user.sub,
      user.role,
      cohortId,
      +anneeUniv,
      weekStart,
    );
  }

  @Post('cohort/:cohortId/roll-week')
  @UseGuards(RolesGuard)
  @Roles(...GRADES_WRITE)
  saveClassRollWeek(
    @CurrentUser() user: { sub: string; role: string },
    @Param('cohortId') cohortId: string,
    @Body()
    body: {
      anneeUniv: number;
      entries: {
        personId: string;
        date: string;
        status: string;
        comment?: string | null;
      }[];
    },
  ) {
    return this.service.saveClassRollWeekBatch(
      user.sub,
      user.role,
      cohortId,
      body.anneeUniv,
      body.entries ?? [],
    );
  }

  @Get('ec/:ecId/evaluation-sheet')
  @UseGuards(RolesGuard)
  @Roles(...GRADES_EC_READ)
  getEvaluationSheet(
    @CurrentUser() user: { sub: string; role: string },
    @Param('ecId') ecId: string,
    @Query('session') session: string,
    @Query('anneeUniv') anneeUniv: string,
  ) {
    return this.service.getEvaluationSheetForEc(
      user.sub,
      user.role,
      ecId,
      +session,
      +anneeUniv,
    );
  }

  @Post('ec/:ecId/evaluation-sheet')
  @UseGuards(RolesGuard)
  @Roles(...GRADES_WRITE)
  saveEvaluationSheet(
    @CurrentUser() user: { sub: string; role: string },
    @Param('ecId') ecId: string,
    @Body()
    body: {
      session: number;
      anneeUniv: number;
      rows: {
        personId: string;
        notes: Record<string, number | null | undefined>;
      }[];
    },
  ) {
    return this.service.saveEvaluationSheetBatch(
      user.sub,
      user.role,
      ecId,
      body.session,
      body.anneeUniv,
      body.rows ?? [],
    );
  }

  @Get('ec/:ecId/students')
  @UseGuards(RolesGuard)
  @Roles(...GRADES_EC_READ)
  getStudentsForEC(
    @Param('ecId') ecId: string,
    @Query('anneeUniv') anneeUniv: string,
  ) {
    return this.service.getStudentsForEC(ecId, +anneeUniv);
  }

  @Get('ec/:ecId/evaluations')
  @UseGuards(RolesGuard)
  @Roles(...GRADES_EC_READ)
  listEvaluationsForEc(
    @Param('ecId') ecId: string,
    @Query('session') session: string,
    @Query('anneeUniv') anneeUniv: string,
  ) {
    return this.service.listEvaluationsForEc(ecId, +session, +anneeUniv);
  }

  @Get('ec/:ecId')
  @UseGuards(RolesGuard)
  @Roles(...GRADES_EC_READ)
  getGradesForEC(
    @Param('ecId') ecId: string,
    @Query('session') session: string,
    @Query('anneeUniv') anneeUniv: string,
    @Query('semestreId') semestreId?: string,
    @Query('evaluationType') evaluationType?: string,
    @Query('evaluationLibelle') evaluationLibelle?: string,
  ) {
    return this.service.getGradesForEC(
      ecId,
      +session,
      +anneeUniv,
      semestreId,
      evaluationType,
      evaluationLibelle,
    );
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...GRADES_WRITE)
  createOrUpdateGrade(
    @CurrentUser() user: { sub: string },
    @Body()
    body: {
      personId: string;
      ecId: string;
      session: number;
      anneeUniv: number;
      note: number;
      evaluationType?: string;
      evaluationLibelle?: string;
    },
  ) {
    return this.service.createOrUpdateGrade(user.sub, body);
  }

  @Get('me')
  @UseGuards(RolesGuard)
  @Roles(...GRADES_ME)
  async getMyGrades(
    @CurrentUser() user: { sub: string },
    @Query('anneeUniv') anneeUniv?: string,
  ) {
    const person = await this.prisma.person.findFirst({
      where: { userId: user.sub },
    });
    if (!person) return [];
    return this.service.getGradesByPerson(
      person.id,
      anneeUniv ? +anneeUniv : undefined,
    );
  }

  @Get('modification-requests')
  @UseGuards(RolesGuard)
  @Roles(...GRADES_MODIFICATION_READ)
  getModificationRequests(@Query('statut') statut?: string) {
    return this.service.getModificationRequests(statut);
  }

  @Post('modification-requests')
  @UseGuards(RolesGuard)
  @Roles('TEACHER')
  createModificationRequest(
    @CurrentUser() user: { sub: string },
    @Body() body: { gradeId: string; motif: string; nouvelleNote: number },
  ) {
    return this.service.createModificationRequest(user.sub, body);
  }

  @Patch('modification-requests/:id/approve')
  @UseGuards(RolesGuard)
  @Roles(...GRADES_APPROVE_REJECT)
  approveModificationRequest(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string; role?: string },
  ) {
    return this.service.approveModificationRequest(id, user.sub, {
      bypassVerrouilleJury: user.role === 'SUPER_ADMIN',
    });
  }

  @Patch('modification-requests/:id/reject')
  @UseGuards(RolesGuard)
  @Roles(...GRADES_APPROVE_REJECT)
  rejectModificationRequest(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.service.rejectModificationRequest(id, user.sub);
  }

  @Get('cohort/:cohortId/students')
  @UseGuards(RolesGuard)
  @Roles(...GRADES_EC_READ)
  getStudentsByCohort(
    @Param('cohortId') cohortId: string,
    @Query('anneeUniv') anneeUniv: string,
  ) {
    return this.service.getStudentsByCohort(cohortId, +anneeUniv);
  }

  @Get('cohort/:cohortId/ecs')
  @UseGuards(RolesGuard)
  @Roles(...GRADES_EC_READ)
  getECsForCohort(
    @Param('cohortId') cohortId: string,
    @Query('anneeUniv') anneeUniv: string,
    @Query('session') session: string,
  ) {
    return this.service.getECsForCohort(cohortId, +anneeUniv, +session);
  }

  @Get('cohort/:cohortId/grid')
  @UseGuards(RolesGuard)
  @Roles(...GRADES_EC_READ)
  getGradesGridForCohort(
    @Param('cohortId') cohortId: string,
    @Query('anneeUniv') anneeUniv: string,
    @Query('session') session: string,
  ) {
    return this.service.getGradesGridForCohort(cohortId, +anneeUniv, +session);
  }

  @Get('cohort/:cohortId/template')
  @UseGuards(RolesGuard)
  @Roles(...GRADES_EC_READ)
  async getNotesTemplate(
    @Param('cohortId') cohortId: string,
    @Query('anneeUniv') anneeUniv: string,
    @Query('session') session: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    const annee = +anneeUniv;
    const sess = +session;
    const [students, ecs] = await Promise.all([
      this.service.getStudentsByCohort(cohortId, annee),
      this.service.getECsForCohort(cohortId, annee, sess),
    ]);
    const csv = this.service.getNotesTemplateCsv(students, ecs);
    const filename = `notes-classe-${cohortId}-${annee}-S${sess}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv);
  }
}
