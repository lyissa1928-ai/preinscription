import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@agriculture/shared';
import { AlertsService } from './alerts.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MuteAlertDto } from './dto/alert.dto';

@ApiTags('farmer')
@ApiBearerAuth()
@Controller('farmer/alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.FARMER, UserRole.ADMIN)
export class AlertsController {
  constructor(private readonly service: AlertsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des alertes' })
  async list(
    @CurrentUser() user: { sub: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('severity') severity?: string,
  ) {
    return this.service.list(
      user.sub,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
      status,
      severity,
    );
  }

  @Get('summary')
  @ApiOperation({ summary: 'Résumé alertes' })
  async summary(@CurrentUser() user: { sub: string }) {
    return this.service.summary(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail alerte' })
  async getOne(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.service.getOne(user.sub, id);
  }

  @Post(':id/ack')
  @ApiOperation({ summary: 'Acquitter alerte' })
  async ack(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.service.ack(user.sub, id);
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Résoudre alerte' })
  async resolve(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.service.resolve(user.sub, id);
  }

  @Post(':id/mute')
  @ApiOperation({ summary: 'Mettre en sourdine' })
  async mute(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: MuteAlertDto,
  ) {
    return this.service.mute(user.sub, id, dto.hours);
  }
}
