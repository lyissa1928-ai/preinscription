import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@agriculture/shared';
import { AdminSensorsService } from './admin-sensors.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateSensorDto, UpdateSensorDto, IotIngestDto } from './dto/sensor.dto';

@ApiTags('admin')
@Controller('admin/sensors')
export class AdminSensorsController {
  constructor(private readonly service: AdminSensorsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TECHNICIAN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste des capteurs' })
  async list(
    @CurrentUser() user: { sub: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('type') type?: string,
    @Query('parcelId') parcelId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.list(user.sub, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      q,
      type,
      parcelId,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @Get('parcels')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TECHNICIAN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste des parcelles pour association capteur' })
  async listParcels(@CurrentUser() user: { sub: string }) {
    return this.service.listParcelsForSensors();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TECHNICIAN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Détail capteur' })
  async getOne(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.service.getOne(user.sub, id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TECHNICIAN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer capteur' })
  async create(@CurrentUser() user: { sub: string }, @Body() dto: CreateSensorDto) {
    return this.service.create(user.sub, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TECHNICIAN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier capteur' })
  async update(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: UpdateSensorDto,
  ) {
    return this.service.update(user.sub, id, dto);
  }

  @Post(':id/regenerate-key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TECHNICIAN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Régénérer la clé API du capteur' })
  async regenerateKey(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.service.regenerateApiKey(user.sub, id);
  }
}
