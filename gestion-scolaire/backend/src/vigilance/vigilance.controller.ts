import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VigilanceService } from './vigilance.service';

@Controller('vigilance')
@UseGuards(AuthGuard('jwt'))
export class VigilanceController {
  constructor(private service: VigilanceService) {}

  @Get('presence')
  getPresenceToday(@Query('type') type?: 'TEACHER' | 'STAFF' | 'all') {
    return this.service.getPresenceToday(type);
  }
}
