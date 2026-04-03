'use client';

import { useQuery } from '@tanstack/react-query';
import { farmerApi } from '@/lib/api';
import { WeatherForecastCard } from './WeatherForecastCard';

export function DashboardWeatherWidget({ parcelId }: { parcelId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['parcel-weather', parcelId, 7],
    queryFn: () => farmerApi.getParcelWeather(parcelId, 7),
    staleTime: 30 * 60 * 1000,
  });

  if (error) return null;
  return (
    <WeatherForecastCard
      daily={data?.daily ?? []}
      stale={data?.stale}
      fromCache={data?.fromCache}
      isLoading={isLoading}
    />
  );
}
