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
import { CropsService } from './crops.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateCropDto, UpdateCropDto } from './dto/crop.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/crops')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CropsController {
  constructor(private readonly cropsService: CropsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.AGRONOMIST)
  @ApiOperation({ summary: 'Liste des cultures (paginé)' })
  async list(
    @CurrentUser() user: { sub: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.cropsService.listAdmin(user.sub, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      q,
      category,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.AGRONOMIST)
  @ApiOperation({ summary: 'Détail culture' })
  async getOne(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.cropsService.getOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Créer culture' })
  async create(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateCropDto,
  ) {
    return this.cropsService.create(user.sub, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Mettre à jour culture' })
  async update(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: UpdateCropDto,
  ) {
    return this.cropsService.update(user.sub, id, dto);
  }

  @Post(':id/disable')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Désactiver culture' })
  async disable(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.cropsService.setActive(user.sub, id, false);
  }

  @Post(':id/enable')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Activer culture' })
  async enable(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.cropsService.setActive(user.sub, id, true);
  }
}
