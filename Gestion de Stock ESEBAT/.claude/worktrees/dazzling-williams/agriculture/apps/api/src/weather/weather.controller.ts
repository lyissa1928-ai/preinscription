import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@agriculture/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WeatherService } from './weather.service';

@ApiTags('weather')
@ApiBearerAuth()
@Controller('farmer/parcels')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.FARMER, UserRole.ADMIN)
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get(':id/weather')
  @ApiOperation({ summary: 'Météo prévision 7 jours' })
  async getForecast(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Query('days') days?: string
  ) {
    const d = Math.min(Math.max(parseInt(days || '7', 10) || 7, 1), 14);
    return this.weatherService.getForecast(user.sub, id, d);
  }

  @Get(':id/weather/history')
  @ApiOperation({ summary: 'Historique météo' })
  async getHistory(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Query('days') days?: string
  ) {
    const d = Math.min(Math.max(parseInt(days || '30', 10) || 30, 7), 90);
    return this.weatherService.getHistory(user.sub, id, d);
  }
}
