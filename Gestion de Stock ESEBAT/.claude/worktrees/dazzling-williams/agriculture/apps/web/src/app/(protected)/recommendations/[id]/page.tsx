'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { farmerApi } from '@/lib/api';

export default function RecommendationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: rec, isLoading, error } = useQuery({
    queryKey: ['recommendation', id],
    queryFn: () => farmerApi.getRecommendation(id),
  });

  if (isLoading) {
    return (
      <div>
        <div className="mb-6 animate-pulse h-4 w-32 bg-gray-200 rounded" />
        <div className="bg-white rounded-xl shadow p-6 animate-pulse h-64" />
      </div>
    );
  }

  if (error || !rec) {
    return (
      <div className="bg-white rounded-xl shadow p-6">
        <p className="text-red-600">Recommandation non trouvée.</p>
        <Link href="/dashboard" className="text-green-600 hover:underline mt-4 inline-block">
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard" className="text-green-600 hover:underline">
          ← Retour au tableau de bord
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">
        Détail recommandation
      </h1>
      <p className="text-gray-600 text-sm mb-6">
        {new Date(rec.generatedAt).toLocaleString('fr-FR')} • Saison {rec.season} • v{rec.engineVersion}
      </p>

      <div className="bg-white rounded-xl shadow p-6 space-y-6">
        <h2 className="font-semibold text-gray-800">Top 5 cultures</h2>
        {rec.results.map((r) => (
          <div key={r.cropId} className="border rounded-lg p-4">
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
  );
}
