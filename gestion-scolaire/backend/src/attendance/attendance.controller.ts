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
import { AttendanceService } from './attendance.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  ATTENDANCE_TEACHER,
  ATTENDANCE_SUPERVISE,
} from '../common/rbac.constants';

@Controller('attendance')
@UseGuards(AuthGuard('jwt'))
export class AttendanceController {
  constructor(private service: AttendanceService) {}

  @Get('my-courses-today')
  @UseGuards(RolesGuard)
  @Roles(...ATTENDANCE_TEACHER)
  getCoursesForToday(@CurrentUser() user: { sub: string }) {
    return this.service.getCoursesForToday(user.sub);
  }

  @Post('arrivee')
  @UseGuards(RolesGuard)
  @Roles(...ATTENDANCE_TEACHER)
  pointArrivee(
    @CurrentUser() user: { sub: string },
    @Body() body: { courseId: string },
  ) {
    return this.service.pointArrivee(user.sub, body.courseId);
  }

  @Post('depart')
  @UseGuards(RolesGuard)
  @Roles(...ATTENDANCE_TEACHER)
  pointDepart(
    @CurrentUser() user: { sub: string },
    @Body() body: { courseId: string },
  ) {
    return this.service.pointDepart(user.sub, body.courseId);
  }

  @Get('me')
  @UseGuards(RolesGuard)
  @Roles(...ATTENDANCE_TEACHER)
  getMyAttendances(
    @CurrentUser() user: { sub: string },
    @Query('mois') mois?: string,
    @Query('annee') annee?: string,
  ) {
    return this.service.getMyAttendances(
      user.sub,
      mois ? +mois : undefined,
      annee ? +annee : undefined,
    );
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ATTENDANCE_SUPERVISE)
  findAll(
    @Query('personId') personId?: string,
    @Query('statut') statut?: string,
    @Query('mois') mois?: string,
    @Query('annee') annee?: string,
  ) {
    return this.service.findAll({
      personId,
      statut,
      mois: mois ? +mois : undefined,
      annee: annee ? +annee : undefined,
    });
  }

  @Patch(':id/validate')
  @UseGuards(RolesGuard)
  @Roles(...ATTENDANCE_SUPERVISE)
  validate(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() body: { statut: 'VALIDE' | 'NON_REMUNERE' | 'REFUSE' },
  ) {
    return this.service.validate(id, user.sub, body.statut);
  }

  /** Scan QR badge enseignant (JWT) — présence journalière. */
  @Post('scan-teacher-badge')
  @UseGuards(RolesGuard)
  @Roles(...ATTENDANCE_SUPERVISE, 'SCOLARITE')
  scanTeacherBadge(@Body() body: { qr: string }) {
    return this.service.recordTeacherPresenceFromBadgeQr(body?.qr ?? '');
  }

  /** Journal des scans de badges (supervision). */
  @Get('badge-scan-logs')
  @UseGuards(RolesGuard)
  @Roles(...ATTENDANCE_SUPERVISE, 'ADMIN', 'SUPER_ADMIN')
  badgeScanLogs(@Query('take') take?: string) {
    return this.service.listBadgeScanLogs(take ? Math.min(500, +take) : 100);
  }
}
