import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  IWeatherProvider,
  WeatherDailyItem,
} from '../interfaces/weather-provider.interface';

interface OpenWeatherListItem {
  dt: number;
  main: { temp_min?: number; temp_max?: number; temp?: number; humidity?: number };
  rain?: { '3h'?: number };
  wind?: { speed?: number };
}

interface OpenWeatherResponse {
  list?: OpenWeatherListItem[];
}

@Injectable()
export class OpenWeatherProvider implements IWeatherProvider {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.openweathermap.org/data/2.5';

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('OPENWEATHER_API_KEY', '');
  }

  async fetchDailyForecast(
    lat: number,
    lng: number,
    days: number
  ): Promise<WeatherDailyItem[]> {
    if (!this.apiKey) {
      throw new Error('OPENWEATHER_API_KEY is not configured');
    }
    const url = `${this.baseUrl}/forecast?lat=${lat}&lon=${lng}&units=metric&appid=${this.apiKey}&cnt=40`;
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenWeather API error: ${res.status} ${text}`);
    }
    const data = (await res.json()) as OpenWeatherResponse;
    if (!data.list || data.list.length === 0) return [];

    const byDate = new Map<
      string,
      { tMin: number[]; tMax: number[]; tAvg: number[]; humidity: number[]; rain: number[]; wind: number[] }
    >();
    for (const item of data.list) {
      const date = new Date(item.dt * 1000).toISOString().slice(0, 10);
      if (!byDate.has(date)) {
        byDate.set(date, { tMin: [], tMax: [], tAvg: [], humidity: [], rain: [], wind: [] });
      }
      const day = byDate.get(date)!;
      if (item.main?.temp_min != null) day.tMin.push(item.main.temp_min);
      if (item.main?.temp_max != null) day.tMax.push(item.main.temp_max);
      if (item.main?.temp != null) day.tAvg.push(item.main.temp);
      if (item.main?.humidity != null) day.humidity.push(item.main.humidity);
      if (item.rain?.['3h'] != null) day.rain.push(item.rain['3h']);
      if (item.wind?.speed != null) day.wind.push(item.wind.speed);
    }

    const result: WeatherDailyItem[] = [];
    const entries = Array.from(byDate.entries()).slice(0, days);
    for (const [date, day] of entries) {
      result.push({
        date,
        tMin: day.tMin.length ? Math.min(...day.tMin) : undefined,
        tMax: day.tMax.length ? Math.max(...day.tMax) : undefined,
        tAvg: day.tAvg.length ? day.tAvg.reduce((a, b) => a + b, 0) / day.tAvg.length : undefined,
        humidityAvg: day.humidity.length
          ? day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length
          : undefined,
        rainfallMm: day.rain.length ? day.rain.reduce((a, b) => a + b, 0) : undefined,
        windSpeedAvg: day.wind.length
          ? day.wind.reduce((a, b) => a + b, 0) / day.wind.length
          : undefined,
      });
    }
    return result;
  }
}
