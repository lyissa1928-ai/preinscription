'use client';

import type { WeatherDailyItem } from '@/lib/api';

interface WeatherHistoryChartProps {
  daily: WeatherDailyItem[];
  isLoading?: boolean;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function WeatherHistoryChart({ daily, isLoading }: WeatherHistoryChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Historique</h3>
        <div className="h-48 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  const maxT = Math.max(...daily.map((d) => d.tMax ?? 0).filter(Boolean), 1);
  const minT = Math.min(...daily.map((d) => d.tMin ?? 0).filter(Boolean), 0);

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="font-semibold text-gray-800 mb-4">Historique (températures)</h3>
      <div className="space-y-2">
        {daily.slice(-14).map((d) => (
          <div key={d.date} className="flex items-center gap-4">
            <span className="text-xs text-gray-500 w-14">{formatDateShort(d.date)}</span>
            <div className="flex-1 flex gap-2 items-center">
              <span className="text-xs w-8">{d.tMin != null ? `${Math.round(d.tMin)}°` : '-'}</span>
              <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden flex">
                {d.tMin != null && d.tMax != null && (
                  <div
                    className="bg-green-200 rounded"
                    style={{
                      width: `${((d.tMax - d.tMin) / (maxT - minT + 10)) * 100}%`,
                      marginLeft: `${((d.tMin - minT) / (maxT - minT + 10)) * 100}%`,
                    }}
                  />
                )}
              </div>
              <span className="text-xs w-8">{d.tMax != null ? `${Math.round(d.tMax)}°` : '-'}</span>
            </div>
            {d.rainfallMm != null && d.rainfallMm > 0 && (
              <span className="text-xs text-blue-600 w-12">🌧 {d.rainfallMm.toFixed(0)}mm</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
