import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface WeatherDailyRecord {
  date: string;
  tMin?: number;
  tMax?: number;
  tAvg?: number;
  humidityAvg?: number;
  rainfallMm?: number;
  windSpeedAvg?: number;
}

@Injectable()
export class WeatherRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertDaily(
    parcelId: string,
    provider: string,
    items: WeatherDailyRecord[]
  ): Promise<void> {
    const fetchedAt = new Date();
    for (const item of items) {
      const date = new Date(item.date);
      await this.prisma.weatherDaily.upsert({
        where: {
          parcelId_date_provider: { parcelId, date, provider },
        },
        create: {
          parcelId,
          date,
          tMin: item.tMin ?? null,
          tMax: item.tMax ?? null,
          tAvg: item.tAvg ?? null,
          humidityAvg: item.humidityAvg ?? null,
          rainfallMm: item.rainfallMm ?? null,
          windSpeedAvg: item.windSpeedAvg ?? null,
          provider,
          fetchedAt,
        },
        update: {
          tMin: item.tMin ?? null,
          tMax: item.tMax ?? null,
          tAvg: item.tAvg ?? null,
          humidityAvg: item.humidityAvg ?? null,
          rainfallMm: item.rainfallMm ?? null,
          windSpeedAvg: item.windSpeedAvg ?? null,
          fetchedAt,
        },
      });
    }
  }

  async getLatestDaily(
    parcelId: string,
    days: number
  ): Promise<{ items: WeatherDailyRecord[]; fetchedAt: Date | null }> {
    const records = await this.prisma.weatherDaily.findMany({
      where: { parcelId },
      orderBy: { date: 'desc' },
      take: days,
    });
    if (records.length === 0) {
      return { items: [], fetchedAt: null };
    }
    const fetchedAt = records.reduce(
      (max, r) => (r.fetchedAt > max ? r.fetchedAt : max),
      records[0]!.fetchedAt
    );
    const items = records.reverse().map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      tMin: r.tMin ?? undefined,
      tMax: r.tMax ?? undefined,
      tAvg: r.tAvg ?? undefined,
      humidityAvg: r.humidityAvg ?? undefined,
      rainfallMm: r.rainfallMm ?? undefined,
      windSpeedAvg: r.windSpeedAvg ?? undefined,
    }));
    return { items, fetchedAt };
  }

  async getHistoryDaily(
    parcelId: string,
    days: number
  ): Promise<WeatherDailyRecord[]> {
    const records = await this.prisma.weatherDaily.findMany({
      where: { parcelId },
      orderBy: { date: 'desc' },
      take: days,
    });
    return records.reverse().map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      tMin: r.tMin ?? undefined,
      tMax: r.tMax ?? undefined,
      tAvg: r.tAvg ?? undefined,
      humidityAvg: r.humidityAvg ?? undefined,
      rainfallMm: r.rainfallMm ?? undefined,
      windSpeedAvg: r.windSpeedAvg ?? undefined,
    }));
  }

  async logFetch(
    parcelId: string,
    provider: string,
    status: 'SUCCESS' | 'FAILED',
    httpStatus?: number,
    errorCode?: string
  ): Promise<void> {
    await this.prisma.weatherFetchLog.create({
      data: { parcelId, provider, status, httpStatus, errorCode, fetchedAt: new Date() },
    });
  }
}
