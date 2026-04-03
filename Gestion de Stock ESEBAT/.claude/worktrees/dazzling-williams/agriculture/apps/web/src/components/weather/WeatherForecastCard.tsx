'use client';

import type { WeatherDailyItem } from '@/lib/api';

interface WeatherForecastCardProps {
  daily: WeatherDailyItem[];
  stale?: boolean;
  fromCache?: boolean;
  isLoading?: boolean;
}

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return DAYS[d.getDay()] + ' ' + d.getDate();
}

export function WeatherForecastCard({ daily, stale, fromCache, isLoading }: WeatherForecastCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-800">Prévisions 7 jours</h3>
          <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-7 gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="bg-gray-100 rounded p-2 h-20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-800">Prévisions 7 jours</h3>
        <div className="flex gap-2">
          {stale && (
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded">
              Données anciennes
            </span>
          )}
          {fromCache && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
              Cache
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
        {daily.map((d) => (
          <div
            key={d.date}
            className="border rounded-lg p-3 text-center bg-gray-50/50"
          >
            <p className="text-xs font-medium text-gray-500">{formatDate(d.date)}</p>
            <p className="text-lg font-bold text-gray-800">
              {d.tMax != null ? `${Math.round(d.tMax)}°` : '-'}
            </p>
            <p className="text-xs text-gray-500">
              {d.tMin != null ? `${Math.round(d.tMin)}°` : '-'}
            </p>
            {d.rainfallMm != null && d.rainfallMm > 0 && (
              <p className="text-xs text-blue-600">🌧 {d.rainfallMm.toFixed(0)} mm</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
