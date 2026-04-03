import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { DeviceTokenGuard } from '../device-token/device-token.guard';
import { AuditService } from '../audit/audit.service';
import { AttendanceService } from '../attendance/attendance.service';

@Controller('badge')
@UseGuards(DeviceTokenGuard)
export class BadgeController {
  constructor(
    private usersService: UsersService,
    private audit: AuditService,
    private attendanceService: AttendanceService,
  ) {}

  @Get('verify')
  async verify(@Req() req: Request, @Query('qr') qr: string) {
    const ip =
      (req as Request & { ip?: string }).ip ??
      req.socket?.remoteAddress ??
      undefined;
    if (!qr?.trim()) {
      await this.audit.log({
        action: 'BADGE_VERIFY',
        entityType: 'Badge',
        newValue: 'EMPTY_QR',
        ip,
      });
      return { valid: false, user: null };
    }
    const result = await this.usersService.verifyBadge(qr.trim());
    await this.audit.log({
      action: 'BADGE_VERIFY',
      entityType: 'Badge',
      entityId: qr.trim(),
      newValue: result.valid ? 'VALID' : 'INVALID',
      ip,
    });
    return result;
  }

  /** Tablette / borne : enregistre la présence enseignant à partir du QR du badge. */
  @Post('scan-teacher-presence')
  async scanTeacherPresence(@Req() req: Request, @Body() body: { qr: string }) {
    const ip =
      (req as Request & { ip?: string }).ip ??
      req.socket?.remoteAddress ??
      undefined;
    const result =
      await this.attendanceService.recordTeacherPresenceFromBadgeQr(
        body?.qr ?? '',
      );
    await this.audit.log({
      action: 'BADGE_SCAN_TEACHER',
      entityType: 'Attendance',
      newValue: result.code,
      ip,
    });
    return result;
  }
}
