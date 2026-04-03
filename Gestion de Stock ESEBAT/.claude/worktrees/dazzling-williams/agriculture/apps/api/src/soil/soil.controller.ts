import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@agriculture/shared';
import { SoilService } from './soil.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateSoilDto } from './dto/soil.dto';

@ApiTags('farmer')
@ApiBearerAuth()
@Controller('farmer/parcels')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.FARMER, UserRole.ADMIN)
export class SoilController {
  constructor(private readonly soilService: SoilService) {}

  @Get(':id/soil')
  @ApiOperation({ summary: 'Profil sol de la parcelle' })
  async get(
    @CurrentUser() user: { sub: string },
    @Param('id') parcelId: string,
  ) {
    return this.soilService.get(user.sub, parcelId);
  }

  @Put(':id/soil')
  @ApiOperation({ summary: 'Mettre à jour profil sol' })
  async update(
    @CurrentUser() user: { sub: string },
    @Param('id') parcelId: string,
    @Body() dto: UpdateSoilDto,
  ) {
    return this.soilService.upsert(user.sub, parcelId, dto);
  }
}
