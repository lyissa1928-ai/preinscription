import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { OpenWeatherProvider } from './providers/openweather.provider';
import { WeatherCacheService } from './weather-cache.service';
import { WeatherRepository } from './weather.repository';

export interface WeatherResponse {
  parcelId: string;
  provider: string;
  stale: boolean;
  fromCache: boolean;
  refreshedAt: string;
  daily: Array<{
    date: string;
    tMin?: number;
    tMax?: number;
    tAvg?: number;
    humidityAvg?: number;
    rainfallMm?: number;
    windSpeedAvg?: number;
  }>;
}

@Injectable()
export class WeatherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly cache: WeatherCacheService,
    private readonly repo: WeatherRepository,
    private readonly openWeather: OpenWeatherProvider
  ) {}

  private getRefreshMs(): number {
    const minutes = this.config.get<number>('WEATHER_REFRESH_MINUTES', 30);
    return minutes * 60 * 1000;
  }

  async getForecast(userId: string, parcelId: string, days: number): Promise<WeatherResponse> {
    const parcel = await this.ensureParcelOwnership(userId, parcelId);
    if (parcel.latitude == null || parcel.longitude == null) {
      throw new NotFoundException({
        code: 'PARCEL_NO_COORDINATES',
        message:
          'Cette parcelle n\'a pas de coordonnées GPS. Ajoutez latitude/longitude pour afficher la météo.',
      });
    }

    const cacheKey = { parcelId, type: 'forecast' as const, days };
    const cached = await this.cache.get<WeatherResponse>(
      parcelId,
      'forecast',
      days
    );
    if (cached) {
      return { ...cached, fromCache: true };
    }

    const refreshMs = this.getRefreshMs();
    const dbData = await this.repo.getLatestDaily(parcelId, days);
    if (dbData.items.length > 0 && dbData.fetchedAt) {
      const age = Date.now() - dbData.fetchedAt.getTime();
      if (age < refreshMs) {
        const payload: WeatherResponse = {
          parcelId,
          provider: 'openweather',
          stale: false,
          fromCache: false,
          refreshedAt: dbData.fetchedAt.toISOString(),
          daily: dbData.items,
        };
        await this.cache.set(parcelId, 'forecast', days, payload);
        return payload;
      }
    }

    try {
      const items = await this.openWeather.fetchDailyForecast(
        parcel.latitude,
        parcel.longitude,
        days
      );
      await this.repo.upsertDaily(parcelId, 'openweather', items);
      await this.repo.logFetch(parcelId, 'openweather', 'SUCCESS', 200);

      const refreshedAt = new Date();
      const payload: WeatherResponse = {
        parcelId,
        provider: 'openweather',
        stale: false,
        fromCache: false,
        refreshedAt: refreshedAt.toISOString(),
        daily: items,
      };
      await this.cache.set(parcelId, 'forecast', days, payload);
      return payload;
    } catch (err) {
      await this.repo.logFetch(
        parcelId,
        'openweather',
        'FAILED',
        undefined,
        err instanceof Error ? err.message : 'UNKNOWN'
      );
      if (dbData.items.length > 0) {
        return {
          parcelId,
          provider: 'openweather',
          stale: true,
          fromCache: false,
          refreshedAt: dbData.fetchedAt!.toISOString(),
          daily: dbData.items,
        };
      }
      throw new NotFoundException({
        code: 'WEATHER_UNAVAILABLE',
        message:
          'Météo indisponible pour cette parcelle. Le fournisseur est inaccessible et aucune donnée en base.',
      });
    }
  }

  async getHistory(userId: string, parcelId: string, days: number): Promise<WeatherResponse> {
    await this.ensureParcelOwnership(userId, parcelId);
    const items = await this.repo.getHistoryDaily(parcelId, days);
    const latest = await this.repo.getLatestDaily(parcelId, 1);
    return {
      parcelId,
      provider: 'openweather',
      stale: false,
      fromCache: false,
      refreshedAt: latest.fetchedAt?.toISOString() ?? new Date().toISOString(),
      daily: items,
    };
  }

  private async ensureParcelOwnership(
    userId: string,
    parcelId: string
  ): Promise<{ id: string; latitude: number | null; longitude: number | null }> {
    const farm = await this.prisma.farm.findUnique({ where: { userId } });
    if (!farm) {
      throw new NotFoundException({
        code: 'FARM_NOT_FOUND',
        message: 'Exploitation non trouvée',
      });
    }
    const parcel = await this.prisma.parcel.findFirst({
      where: { id: parcelId, farmId: farm.id, deletedAt: null },
    });
    if (!parcel) {
      throw new NotFoundException({
        code: 'PARCEL_NOT_FOUND',
        message: 'Parcelle non trouvée',
      });
    }
    return { id: parcel.id, latitude: parcel.latitude, longitude: parcel.longitude };
  }
}
