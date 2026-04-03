import { Module } from '@nestjs/common';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';
import { WeatherCacheService } from './weather-cache.service';
import { WeatherRepository } from './weather.repository';
import { OpenWeatherProvider } from './providers/openweather.provider';

@Module({
  controllers: [WeatherController],
  providers: [
    WeatherService,
    WeatherCacheService,
    WeatherRepository,
    OpenWeatherProvider,
  ],
  exports: [WeatherService, WeatherRepository],
})
export class WeatherModule {}
