'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { farmerApi } from '@/lib/api';
import { WeatherForecastCard } from './WeatherForecastCard';
import { WeatherHistoryChart } from './WeatherHistoryChart';
import Link from 'next/link';

interface ParcelWeatherPanelProps {
  parcelId: string;
  parcelName: string;
  hasCoordinates: boolean;
}

export function ParcelWeatherPanel({
  parcelId,
  parcelName,
  hasCoordinates,
}: ParcelWeatherPanelProps) {
  const [tab, setTab] = useState<'forecast' | 'history'>('forecast');

  const { data: forecast, isLoading: forecastLoading, error: forecastError } = useQuery({
    queryKey: ['parcel-weather', parcelId, 7],
    queryFn: () => farmerApi.getParcelWeather(parcelId, 7),
    enabled: hasCoordinates,
    staleTime: 30 * 60 * 1000,
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['parcel-weather-history', parcelId, 30],
    queryFn: () => farmerApi.getParcelWeatherHistory(parcelId, 30),
    enabled: hasCoordinates && tab === 'history',
    staleTime: 60 * 60 * 1000,
  });

  if (!hasCoordinates) {
    return (
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="font-semibold text-gray-800 mb-2">Météo</h3>
        <p className="text-gray-600 text-sm mb-2">
          Ajoutez les coordonnées GPS (latitude/longitude) sur la parcelle pour afficher la météo.
        </p>
        <Link
          href={`/parcels/${parcelId}`}
          className="text-green-600 hover:underline font-medium text-sm"
        >
          Modifier la parcelle →
        </Link>
      </div>
    );
  }

  if (forecastError) {
    const msg = forecastError instanceof Error ? forecastError.message : 'Erreur';
    return (
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="font-semibold text-gray-800 mb-2">Météo</h3>
        <p className="text-amber-700 text-sm">
          {msg.includes('coordonnées')
            ? msg
            : 'Météo indisponible. Vérifiez les coordonnées GPS de la parcelle.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('forecast')}
          className={`px-4 py-2 rounded-lg font-medium text-sm ${
            tab === 'forecast' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          Prévisions
        </button>
        <button
          onClick={() => setTab('history')}
          className={`px-4 py-2 rounded-lg font-medium text-sm ${
            tab === 'history' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          Historique
        </button>
      </div>
      {tab === 'forecast' && (
        <WeatherForecastCard
          daily={forecast?.daily ?? []}
          stale={forecast?.stale}
          fromCache={forecast?.fromCache}
          isLoading={forecastLoading}
        />
      )}
      {tab === 'history' && (
        <WeatherHistoryChart
          daily={history?.daily ?? []}
          isLoading={historyLoading}
        />
      )}
    </div>
  );
}
