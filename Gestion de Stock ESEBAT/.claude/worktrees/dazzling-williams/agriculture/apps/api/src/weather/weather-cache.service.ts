import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class WeatherCacheService implements OnModuleDestroy {
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
    try {
      this.client = new Redis(url, { maxRetriesPerRequest: 2 });
    } catch {
      this.client = null;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  private getKey(parcelId: string, type: 'forecast' | 'history', days: number): string {
    return `weather:${type}:${parcelId}:days:${days}`;
  }

  async get<T>(parcelId: string, type: 'forecast' | 'history', days: number): Promise<T | null> {
    if (!this.client) return null;
    try {
      const key = this.getKey(parcelId, type, days);
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async set(
    parcelId: string,
    type: 'forecast' | 'history',
    days: number,
    value: unknown
  ): Promise<void> {
    if (!this.client) return;
    const ttl = this.config.get<number>('WEATHER_CACHE_TTL_SECONDS', 1800);
    try {
      const key = this.getKey(parcelId, type, days);
      await this.client.setex(key, ttl, JSON.stringify(value));
    } catch {
      // ignore
    }
  }
}
