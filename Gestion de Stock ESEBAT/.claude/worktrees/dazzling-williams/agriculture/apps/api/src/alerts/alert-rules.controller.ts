import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@agriculture/shared';
import { AlertRulesService } from './alert-rules.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateAlertRuleDto, UpdateAlertRuleDto } from './dto/alert-rule.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/alert-rules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlertRulesController {
  constructor(private readonly service: AlertRulesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TECHNICIAN)
  @ApiOperation({ summary: 'Liste des regles (pagined)' })
  async list(
    @CurrentUser() user: { sub: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('severity') severity?: string,
    @Query('scope') scope?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.listAdmin(user.sub, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      type,
      severity,
      scope,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TECHNICIAN)
  @ApiOperation({ summary: 'Detail regle' })
  async getOne(@Param('id') id: string) {
    return this.service.getOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Creer regle' })
  async create(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateAlertRuleDto,
  ) {
    return this.service.create(user.sub, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Modifier regle' })
  async update(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: UpdateAlertRuleDto,
  ) {
    return this.service.update(user.sub, id, dto);
  }

  @Post(':id/disable')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Desactiver regle' })
  async disable(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.service.setActive(user.sub, id, false);
  }

  @Post(':id/enable')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Activer regle' })
  async enable(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.service.setActive(user.sub, id, true);
  }
}
