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
import { CropRequirementsService } from './crop-requirements.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateCropRequirementDto, UpdateCropRequirementDto } from './dto/crop-requirement.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/crop-requirements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CropRequirementsController {
  constructor(private readonly service: CropRequirementsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.AGRONOMIST)
  @ApiOperation({ summary: 'Liste des règles agronomiques (paginé)' })
  async list(
    @CurrentUser() user: { sub: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('cropId') cropId?: string,
    @Query('regionId') regionId?: string,
    @Query('season') season?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.listAdmin(user.sub, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      cropId,
      regionId,
      season,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.AGRONOMIST)
  @ApiOperation({ summary: 'Détail règle' })
  async getOne(@Param('id') id: string) {
    return this.service.getOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Créer règle' })
  async create(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateCropRequirementDto,
  ) {
    return this.service.create(user.sub, {
      ...dto,
      season: dto.season ?? 'ANY',
      weightPh: dto.weightPh ?? 20,
      weightMoisture: dto.weightMoisture ?? 20,
      weightSalinity: dto.weightSalinity ?? 20,
      weightRainfall: dto.weightRainfall ?? 20,
      weightTemp: dto.weightTemp ?? 20,
    });
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Mettre à jour règle' })
  async update(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: UpdateCropRequirementDto,
  ) {
    return this.service.update(user.sub, id, dto);
  }

  @Post(':id/disable')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Désactiver règle' })
  async disable(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.service.setActive(user.sub, id, false);
  }

  @Post(':id/enable')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Activer règle' })
  async enable(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.service.setActive(user.sub, id, true);
  }

  @Post(':id/new-version')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Créer nouvelle version de la règle' })
  async newVersion(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.service.cloneNewVersion(user.sub, id);
  }
}
