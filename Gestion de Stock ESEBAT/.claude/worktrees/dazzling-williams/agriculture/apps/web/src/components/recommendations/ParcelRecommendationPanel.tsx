'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { farmerApi } from '@/lib/api';
import type { RecommendationResultDTO } from '@/lib/api';

interface ParcelRecommendationPanelProps {
  parcelId: string;
}

export function ParcelRecommendationPanel({ parcelId }: ParcelRecommendationPanelProps) {
  const queryClient = useQueryClient();
  const [season, setSeason] = useState<'DRY' | 'RAINY' | null>(null);
  const [lastResult, setLastResult] = useState<{
    results: RecommendationResultDTO[];
    season: string;
    topCropName: string | null;
    topScore: number | null;
  } | null>(null);

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['parcel-recommendations', parcelId],
    queryFn: () => farmerApi.getParcelRecommendations(parcelId, 1, 10),
  });

  const runMutation = useMutation({
    mutationFn: () =>
      farmerApi.runRecommendation(parcelId, {
        season: season ?? undefined,
        historyDays: 30,
      }),
    onSuccess: (res) => {
      setLastResult({
        results: res.results,
        season: res.season,
        topCropName: res.results[0]?.cropName ?? null,
        topScore: res.results[0]?.score ?? null,
      });
      queryClient.invalidateQueries({ queryKey: ['parcel-recommendations', parcelId] });
      queryClient.invalidateQueries({ queryKey: ['farmer-dashboard'] });
    },
  });

  const handleRun = () => {
    runMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Lancer une recommandation</h3>
        <p className="text-gray-600 text-sm mb-4">
          Obtenez des suggestions de cultures adaptées à votre parcelle (sol, météo, saison).
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Saison</label>
            <select
              value={season ?? 'auto'}
              onChange={(e) => setSeason(e.target.value === 'auto' ? null : (e.target.value as 'DRY' | 'RAINY'))}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="auto">Auto (actuelle)</option>
              <option value="DRY">Sèche</option>
              <option value="RAINY">Pluvieuse</option>
            </select>
          </div>
          <button
            onClick={handleRun}
            disabled={runMutation.isPending}
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 mt-6"
          >
            {runMutation.isPending ? 'Calcul en cours...' : 'Lancer recommandation'}
          </button>
        </div>
        {runMutation.error && (
          <p className="mt-4 text-red-600 text-sm">
            {runMutation.error instanceof Error ? runMutation.error.message : 'Erreur'}
          </p>
        )}
      </div>

      {lastResult && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-semibold text-gray-800 mb-2">
            Top 5 cultures ({lastResult.season})
          </h3>
          <div className="space-y-4">
            {lastResult.results.slice(0, 5).map((r) => (
              <div
                key={r.cropId}
                className="border rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-800">{r.cropName}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-sm font-medium ${
                      r.recommended ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {r.score}/100
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-2">{r.explainText}</p>
                {r.positiveReasons.length > 0 && (
                  <ul className="text-sm text-green-700 list-disc list-inside mb-1">
                    {r.positiveReasons.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                )}
                {r.negativeReasons.length > 0 && (
                  <ul className="text-sm text-amber-700 list-disc list-inside mb-1">
                    {r.negativeReasons.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                )}
                {r.missingData.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.missingData.map((s, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Historique</h3>
        {historyLoading ? (
          <div className="animate-pulse h-24 bg-gray-100 rounded" />
        ) : history?.data && history.data.length > 0 ? (
          <ul className="space-y-2">
            {history.data.map((rec) => (
              <li
                key={rec.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <span className="text-gray-700">
                  {new Date(rec.generatedAt).toLocaleDateString('fr-FR')} –{' '}
                  {rec.topCropName ?? '-'} ({rec.topScore ?? '-'}/100)
                </span>
                <Link
                  href={`/recommendations/${rec.id}`}
                  className="text-green-600 hover:underline text-sm"
                >
                  Détail
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm">Aucune recommandation pour l&apos;instant.</p>
        )}
      </div>
    </div>
  );
}
