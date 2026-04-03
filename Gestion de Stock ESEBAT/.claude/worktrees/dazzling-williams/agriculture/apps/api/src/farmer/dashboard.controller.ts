import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@agriculture/shared';
import { ParcelsService } from './parcels.service';
import { FarmService } from './farm.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('farmer')
@ApiBearerAuth()
@Controller('farmer/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.FARMER, UserRole.ADMIN)
export class DashboardController {
  constructor(
    private readonly parcelsService: ParcelsService,
    private readonly farmService: FarmService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Dashboard farmer - exploitation + stats + parcelles' })
  async index(
    @CurrentUser() user: { sub: string },
    @Query('recentLimit') recentLimit?: string,
  ) {
    const farm = await this.farmService.findByUserId(user.sub);
    if (!farm) {
      return { farm: null, stats: null, recentParcels: [] };
    }
    const [stats, recentParcels] = await Promise.all([
      this.parcelsService.getStats(user.sub),
      this.parcelsService.getRecent(
        user.sub,
        recentLimit ? parseInt(recentLimit, 10) : 5,
      ),
    ]);
    return { farm, stats, recentParcels };
  }
}
