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
import { AdminRegionsService } from './admin-regions.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateRegionDto, UpdateRegionDto } from './dto/admin-region.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/regions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminRegionsController {
  constructor(private readonly service: AdminRegionsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.AGRONOMIST, UserRole.TECHNICIAN)
  @ApiOperation({ summary: 'Liste des regions (pagined)' })
  async list(
    @CurrentUser() user: { sub: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('zone') zone?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.list(user.sub, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      q,
      zone,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.AGRONOMIST, UserRole.TECHNICIAN)
  @ApiOperation({ summary: 'Detail region' })
  async getOne(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.service.getOne(user.sub, id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Creer region' })
  async create(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateRegionDto,
  ) {
    return this.service.create(user.sub, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Modifier region' })
  async update(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: UpdateRegionDto,
  ) {
    return this.service.update(user.sub, id, dto);
  }

  @Post(':id/disable')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Desactiver region' })
  async disable(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.service.setActive(user.sub, id, false);
  }

  @Post(':id/enable')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Activer region' })
  async enable(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.service.setActive(user.sub, id, true);
  }
}
