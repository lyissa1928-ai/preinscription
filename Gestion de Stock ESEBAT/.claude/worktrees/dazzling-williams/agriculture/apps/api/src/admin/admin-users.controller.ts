import {
  Controller,
  Get,
  Post,
  Patch,
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
import { AdminUsersService } from './admin-users.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateAdminUserDto, UpdateAdminUserDto } from './dto/admin-user.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des utilisateurs (paginé)' })
  async list(
    @CurrentUser() user: { sub: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.list(user.sub, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      q,
      role,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail utilisateur' })
  async getOne(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.service.getOne(user.sub, id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer utilisateur' })
  async create(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateAdminUserDto,
  ) {
    return this.service.create(user.sub, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier utilisateur' })
  async update(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.service.update(user.sub, id, dto);
  }

  @Post(':id/disable')
  @ApiOperation({ summary: 'Désactiver utilisateur' })
  async disable(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.service.setActive(user.sub, id, false);
  }

  @Post(':id/enable')
  @ApiOperation({ summary: 'Activer utilisateur' })
  async enable(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.service.setActive(user.sub, id, true);
  }
}
