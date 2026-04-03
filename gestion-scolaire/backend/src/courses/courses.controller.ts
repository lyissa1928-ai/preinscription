import {
  BadRequestException,
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
import { CoursesService } from './courses.service';
import { EdtExportService } from './edt-export.service';
import { SeancesService } from './seances.service';
import { PrismaService } from '../prisma/prisma.service';
import { COURSES_MANAGE, COURSES_READ } from '../common/rbac.constants';

@Controller('courses')
@UseGuards(AuthGuard('jwt'))
export class CoursesController {
  constructor(
    private service: CoursesService,
    private seances: SeancesService,
    private prisma: PrismaService,
    private edtExport: EdtExportService,
  ) {}

  @Get('template')
  @UseGuards(RolesGuard)
  @Roles(...COURSES_MANAGE)
  getTemplate(@Res({ passthrough: false }) res: Response) {
    const buffer = this.service.getTemplateExcel();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=template-emploi-du-temps.xlsx',
    );
    res.send(buffer);
  }

  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles(...COURSES_MANAGE)
  bulkCreate(
    @Body()
    body: {
      items: Array<{
        ecCode: string;
        teacherMatricule: string;
        salleCode: string;
        jour: number;
        heureDebut: number;
        heureFin: number;
        type: string;
        groupe?: string;
        anneeUniv: number;
      }>;
    },
  ) {
    return this.service.bulkCreate(body.items ?? []);
  }

  @Patch('bulk')
  @UseGuards(RolesGuard)
  @Roles(...COURSES_MANAGE)
  bulkUpdate(
    @Body()
    body: {
      items: Array<
        { id: string } & Partial<{
          ecId: string;
          teacherId: string;
          salleId: string;
          jour: number;
          heureDebut: number;
          heureFin: number;
          type: string;
          groupe: string;
          anneeUniv: number;
        }>
      >;
    },
  ) {
    return this.service.bulkUpdate(body.items ?? []);
  }

  @Delete('bulk')
  @UseGuards(RolesGuard)
  @Roles(...COURSES_MANAGE)
  bulkDelete(@Body() body: { ids: string[] }) {
    return this.service.bulkDelete(body.ids ?? []);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...COURSES_READ)
  findAll(
    @Query('semestreId') semestreId?: string,
    @Query('formationId') formationId?: string,
    @Query('teacherId') teacherId?: string,
    @Query('salleId') salleId?: string,
    @Query('campusId') campusId?: string,
    @Query('anneeUniv') anneeUniv?: string,
  ) {
    return this.service.findAll({
      semestreId,
      formationId,
      teacherId,
      salleId,
      campusId,
      anneeUniv: anneeUniv ? +anneeUniv : undefined,
    });
  }

  @Get('check-conflicts')
  @UseGuards(RolesGuard)
  @Roles(...COURSES_MANAGE)
  checkConflicts(
    @Query('salleId') salleId: string,
    @Query('teacherId') teacherId: string,
    @Query('jour') jour: string,
    @Query('heureDebut') heureDebut: string,
    @Query('heureFin') heureFin: string,
    @Query('anneeUniv') anneeUniv?: string,
    @Query('groupe') groupe?: string,
    @Query('excludeCourseId') excludeCourseId?: string,
  ) {
    const y = anneeUniv ? +anneeUniv : new Date().getFullYear();
    return this.service.checkConflictsPreview({
      salleId,
      teacherId,
      jour: +jour,
      heureDebut: +heureDebut,
      heureFin: +heureFin,
      anneeUniv: y,
      groupe: groupe || undefined,
      excludeCourseId: excludeCourseId?.trim() || undefined,
    });
  }

  @Get('me/dashboard')
  @UseGuards(RolesGuard)
  @Roles('TEACHER')
  async getMyDashboard(@CurrentUser() user: { sub: string }) {
    const person = await this.prisma.person.findFirst({
      where: { userId: user.sub },
    });
    if (!person || person.type !== 'TEACHER')
      return { enCours: [], historique: [] };
    return this.service.getDashboardForTeacher(person.id);
  }

  @Get('me/classes')
  @UseGuards(RolesGuard)
  @Roles('TEACHER')
  async getMyTeachingClasses(@CurrentUser() user: { sub: string }) {
    const person = await this.prisma.person.findFirst({
      where: { userId: user.sub },
    });
    if (!person || person.type !== 'TEACHER') return [];
    return this.service.getDistinctCohortsForTeacher(person.id);
  }

  @Get('me')
  @UseGuards(RolesGuard)
  @Roles('TEACHER', 'STUDENT')
  async findMyCourses(
    @CurrentUser() user: { sub: string },
    @Query('anneeUniv') anneeUniv?: string,
  ) {
    const person = await this.prisma.person.findFirst({
      where: { userId: user.sub },
    });
    if (!person) return [];
    if (person.type === 'TEACHER') {
      return this.service.findByTeacherPersonId(
        person.id,
        anneeUniv ? +anneeUniv : undefined,
      );
    }
    if (person.type === 'STUDENT') {
      const ins = await this.prisma.inscription.findFirst({
        where: { personId: person.id, statut: { not: 'ANNULEE' } },
        orderBy: { anneeUniv: 'desc' },
      });
      if (!ins) return [];
      return this.service.findByStudentSemestre(
        ins.semestreId,
        anneeUniv ? +anneeUniv : ins.anneeUniv,
      );
    }
    return [];
  }

  @Patch('seances/:seanceId/pointage')
  @UseGuards(RolesGuard)
  @Roles(...COURSES_MANAGE)
  patchSeancePointage(
    @Param('seanceId') seanceId: string,
    @Body() body: { pointageActif: boolean },
  ) {
    return this.seances.setPointageSeance(
      seanceId,
      body.pointageActif === true,
    );
  }

  /** Préfixe by-course pour éviter le conflit avec /courses/me */
  @Get('by-course/:courseId/seances')
  @UseGuards(RolesGuard)
  @Roles(...COURSES_READ)
  listSeances(@Param('courseId') courseId: string) {
    return this.seances.listByCourse(courseId);
  }

  @Post('by-course/:courseId/seances/generate')
  @UseGuards(RolesGuard)
  @Roles(...COURSES_MANAGE)
  generateSeances(
    @Param('courseId') courseId: string,
    @Body() body: { dateDebut: string; nbSemaines?: number },
    @CurrentUser() user: { sub: string },
  ) {
    const d = new Date(body.dateDebut);
    if (Number.isNaN(d.getTime()))
      throw new BadRequestException('dateDebut invalide (ISO YYYY-MM-DD)');
    return this.seances.generateForCourse(
      courseId,
      d,
      body.nbSemaines ?? 16,
      user.sub,
    );
  }

  @Post('by-course/:courseId/seances/activate-all')
  @UseGuards(RolesGuard)
  @Roles(...COURSES_MANAGE)
  activateSeancesPointage(@Param('courseId') courseId: string) {
    return this.seances.activateAllUpcomingForCourse(courseId);
  }

  /** Export officiel EDT du campus (PDF) : logo, établissement, responsable pédagogique, année, grille. */
  @Get('export/campus-pdf')
  @UseGuards(RolesGuard)
  @Roles(...COURSES_MANAGE)
  async exportCampusPdf(
    @Res({ passthrough: false }) res: Response,
    @Query('campusId') campusId: string,
    @Query('anneeUniv') anneeUniv: string,
    @Query('teacherId') teacherId?: string,
  ) {
    const id = this.edtExport.assertCampusId(campusId);
    const y = anneeUniv ? +anneeUniv : new Date().getFullYear();
    const campus = await this.prisma.campus.findUnique({ where: { id } });
    const code = campus
      ? campus.code.replace(/[^a-zA-Z0-9-_]/g, '_')
      : 'campus';
    const buf = await this.edtExport.buildCampusPdf(
      id,
      y,
      teacherId?.trim() || undefined,
    );
    const filename = `EDT_${code}_${y}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    res.send(buf);
  }

  /** Export officiel EDT du campus (Word .docx) : mêmes informations que le PDF. */
  @Get('export/campus-docx')
  @UseGuards(RolesGuard)
  @Roles(...COURSES_MANAGE)
  async exportCampusDocx(
    @Res({ passthrough: false }) res: Response,
    @Query('campusId') campusId: string,
    @Query('anneeUniv') anneeUniv: string,
    @Query('teacherId') teacherId?: string,
  ) {
    const id = this.edtExport.assertCampusId(campusId);
    const y = anneeUniv ? +anneeUniv : new Date().getFullYear();
    const campus = await this.prisma.campus.findUnique({ where: { id } });
    const code = campus
      ? campus.code.replace(/[^a-zA-Z0-9-_]/g, '_')
      : 'campus';
    const buf = await this.edtExport.buildCampusDocx(
      id,
      y,
      teacherId?.trim() || undefined,
    );
    const filename = `EDT_${code}_${y}.docx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    res.send(buf);
  }

  /** EDT personnel enseignant : tous les cours, tous campus, un seul tableau (PDF). */
  @Get('export/me-pdf')
  @UseGuards(RolesGuard)
  @Roles('TEACHER')
  async exportTeacherEdtPdf(
    @Res({ passthrough: false }) res: Response,
    @CurrentUser() user: { sub: string },
    @Query('anneeUniv') anneeUniv?: string,
  ) {
    const y = anneeUniv ? +anneeUniv : new Date().getFullYear();
    const buf = await this.edtExport.buildTeacherEdtPdf(user.sub, y);
    const filename = `Mon_EDT_${y}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    res.send(buf);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(...COURSES_READ)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...COURSES_MANAGE)
  create(
    @Body()
    body: {
      ecId: string;
      teacherId: string;
      salleId: string;
      jour: number;
      heureDebut: number;
      heureFin: number;
      type: string;
      groupe?: string;
      anneeUniv: number;
      cohortId?: string | null;
      groupId?: string | null;
      pointageActif?: boolean;
    },
  ) {
    return this.service.create(body);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(...COURSES_MANAGE)
  update(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      ecId: string;
      teacherId: string;
      salleId: string;
      jour: number;
      heureDebut: number;
      heureFin: number;
      type: string;
      groupe: string;
      anneeUniv: number;
      cohortId: string | null;
      groupId: string | null;
      pointageActif: boolean;
    }>,
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(...COURSES_MANAGE)
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
