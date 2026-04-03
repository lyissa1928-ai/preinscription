import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { ParcelsService } from './parcels.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateParcelDto, UpdateParcelDto } from './dto/parcel.dto';

@ApiTags('farmer')
@ApiBearerAuth()
@Controller('farmer/parcels')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.FARMER, UserRole.ADMIN)
export class ParcelsController {
  constructor(private readonly parcelsService: ParcelsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des parcelles' })
  async list(
    @CurrentUser() user: { sub: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
    @Query('search') search?: string,
  ) {
    return this.parcelsService.list(
      user.sub,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
      sort || 'createdAt:desc',
      search,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail parcelle' })
  async getOne(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.parcelsService.getOne(user.sub, id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer parcelle' })
  async create(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateParcelDto,
  ) {
    return this.parcelsService.create(user.sub, {
      ...dto,
      status: dto.status ?? 'ACTIVE',
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour parcelle' })
  async update(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: UpdateParcelDto,
  ) {
    return this.parcelsService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer parcelle (soft delete)' })
  async delete(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    await this.parcelsService.softDelete(user.sub, id);
    return { success: true };
  }
}
