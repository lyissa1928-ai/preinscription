import {
  Controller,
  Get,
  Post,
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
import { RecommendationsService } from './recommendations.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RunRecommendationDto } from './dto/recommendation.dto';

@ApiTags('farmer')
@ApiBearerAuth()
@Controller('farmer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.FARMER, UserRole.ADMIN)
export class RecommendationsController {
  constructor(private readonly service: RecommendationsService) {}

  @Post('parcels/:id/recommendations/run')
  @ApiOperation({ summary: 'Lancer une recommandation' })
  async run(
    @CurrentUser() user: { sub: string; role: string },
    @Param('id') parcelId: string,
    @Body() dto: RunRecommendationDto,
  ) {
    return this.service.run(
      user.sub,
      parcelId,
      dto.season ?? null,
      dto.historyDays ?? 30,
      user.role === UserRole.ADMIN,
    );
  }

  @Get('parcels/:id/recommendations')
  @ApiOperation({ summary: 'Historique recommandations par parcelle' })
  async listByParcel(
    @CurrentUser() user: { sub: string; role: string },
    @Param('id') parcelId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listByParcel(
      user.sub,
      parcelId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
      user.role === UserRole.ADMIN,
    );
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Historique recommandations (toutes parcelles)' })
  async listAll(
    @CurrentUser() user: { sub: string; role: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listAll(
      user.sub,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
      user.role === UserRole.ADMIN,
    );
  }

  @Get('recommendations/:id')
  @ApiOperation({ summary: 'Détail recommandation' })
  async getOne(
    @CurrentUser() user: { sub: string; role: string },
    @Param('id') recommendationId: string,
  ) {
    return this.service.getOne(
      user.sub,
      recommendationId,
      user.role === UserRole.ADMIN,
    );
  }
}
