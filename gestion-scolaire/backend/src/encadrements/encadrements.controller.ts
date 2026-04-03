import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EncadrementsService } from './encadrements.service';

@Controller('encadrements')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('TEACHER')
export class EncadrementsController {
  constructor(private service: EncadrementsService) {}

  @Get('me')
  findMyEncadrements(@CurrentUser() user: { sub: string }) {
    return this.service.findMyEncadrements(user.sub);
  }
}
