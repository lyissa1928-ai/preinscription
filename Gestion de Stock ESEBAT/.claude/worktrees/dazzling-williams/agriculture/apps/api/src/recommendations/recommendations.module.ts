import { Module } from '@nestjs/common';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { RecommendationEngine } from './recommendation.engine';
import { WeatherModule } from '../weather/weather.module';

@Module({
  imports: [WeatherModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService, RecommendationEngine],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
