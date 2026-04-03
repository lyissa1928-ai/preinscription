import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { VigileService } from './vigile.service';
import { DeviceTokenGuard } from '../device-token/device-token.guard';

@Controller('vigile')
@UseGuards(DeviceTokenGuard)
export class VigileController {
  constructor(private service: VigileService) {}

  @Post('check-in')
  async checkIn(@Req() req: Request, @Body() body: { matricule?: string }) {
    const ip =
      (req as Request & { ip?: string }).ip ??
      req.socket?.remoteAddress ??
      undefined;
    return this.service.checkIn(body.matricule ?? '', ip);
  }
}
