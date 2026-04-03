import { Controller, Get, Post, Patch, Delete, Body, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@agriculture/shared';
import { FarmService } from './farm.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateFarmDto, UpdateFarmDto } from './dto/farm.dto';

@ApiTags('farmer')
@ApiBearerAuth()
@Controller('farmer/farm')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.FARMER, UserRole.ADMIN)
export class FarmController {
  constructor(private readonly farmService: FarmService) {}

  @Get()
  @ApiOperation({ summary: 'Profil exploitation du farmer' })
  async get(@CurrentUser() user: { sub: string }) {
    const farm = await this.farmService.findByUserId(user.sub);
    if (!farm) {
      throw new NotFoundException({
        code: 'FARM_NOT_FOUND',
        message: 'Exploitation non trouvée',
      });
    }
    return farm;
  }

  @Post()
  @Roles(UserRole.FARMER)
  @ApiOperation({ summary: 'Créer exploitation (agriculteur uniquement)' })
  async create(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateFarmDto,
  ) {
    return this.farmService.create(user.sub, dto);
  }

  @Patch()
  @Roles(UserRole.FARMER)
  @ApiOperation({ summary: 'Mettre à jour exploitation (agriculteur uniquement)' })
  async update(
    @CurrentUser() user: { sub: string },
    @Body() dto: UpdateFarmDto,
  ) {
    return this.farmService.update(user.sub, dto);
  }

  @Delete()
  @Roles(UserRole.FARMER)
  @ApiOperation({ summary: 'Supprimer exploitation (agriculteur uniquement)' })
  async delete(@CurrentUser() user: { sub: string }) {
    await this.farmService.delete(user.sub);
  }
}
