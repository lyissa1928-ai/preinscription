'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { farmerApi, regionsApi } from '@/lib/api';
import { parcelUpdateSchema } from '@agriculture/shared';
import { ParcelWeatherPanel } from '@/components/weather/ParcelWeatherPanel';
import { SoilProfileForm } from '@/components/soil/SoilProfileForm';
import { ParcelRecommendationPanel } from '@/components/recommendations/ParcelRecommendationPanel';
import { SOIL_TYPES, PARCEL_STATUSES } from '@agriculture/shared';

type TabId = 'info' | 'sol' | 'meteo' | 'recos';

export default function ParcelDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [tab, setTab] = useState<TabId>('info');
  const [form, setForm] = useState({
    name: '',
    area: '',
    regionId: '',
    latitude: '',
    longitude: '',
    soilType: 'LOAMY',
    status: 'ACTIVE',
  });

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: () => regionsApi.list(),
  });

  const { data: parcel, isLoading } = useQuery({
    queryKey: ['parcel', id],
    queryFn: () => farmerApi.getParcel(id),
  });

  useEffect(() => {
    if (parcel) {
      setForm({
        name: parcel.name,
        area: String(parcel.area),
        regionId: parcel.regionId,
        latitude: parcel.latitude != null ? String(parcel.latitude) : '',
        longitude: parcel.longitude != null ? String(parcel.longitude) : '',
        soilType: parcel.soilType,
        status: parcel.status,
      });
    }
  }, [parcel]);

  const updateMutation = useMutation({
    mutationFn: () =>
      farmerApi.updateParcel(id, {
        name: form.name,
        area: parseFloat(form.area),
        regionId: form.regionId,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        soilType: form.soilType,
        status: form.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcel', id] });
      queryClient.invalidateQueries({ queryKey: ['parcels'] });
      queryClient.invalidateQueries({ queryKey: ['farmer-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['parcel-weather', id] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => farmerApi.deleteParcel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcels'] });
      queryClient.invalidateQueries({ queryKey: ['farmer-dashboard'] });
      router.push('/parcels');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = parcelUpdateSchema.safeParse({
      ...form,
      area: parseFloat(form.area),
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
    });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Données invalides');
      return;
    }
    updateMutation.mutate();
  };

  if (isLoading || !parcel) {
    return (
      <div>
        <div className="mb-6 animate-pulse h-4 w-32 bg-gray-200 rounded" />
        <div className="bg-white rounded-xl shadow p-6 animate-pulse h-64" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/parcels" className="text-green-600 hover:underline">
          ← Retour aux parcelles
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{parcel.name}</h1>

      <div className="flex gap-2 mb-6">
        {(['info', 'sol', 'meteo', 'recos'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${
              tab === t ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {t === 'info' ? 'Informations' : t === 'sol' ? 'Sol' : t === 'meteo' ? 'Météo' : 'Recommandations'}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Modifier la parcelle</h2>
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow p-6 max-w-xl space-y-4"
      >
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Superficie (ha)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={form.area}
            onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Région</label>
          <select
            value={form.regionId}
            onChange={(e) => setForm((f) => ({ ...f, regionId: e.target.value }))}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            required
          >
            <option value="">Sélectionner</option>
            {regions?.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type de sol</label>
          <select
            value={form.soilType}
            onChange={(e) => setForm((f) => ({ ...f, soilType: e.target.value }))}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
          >
            {SOIL_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
          >
            {PARCEL_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Latitude (optionnel)</label>
            <input
              type="number"
              step="any"
              value={form.latitude}
              onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Longitude (optionnel)</label>
            <input
              type="number"
              step="any"
              value={form.longitude}
              onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
          >
            Enregistrer
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm('Supprimer cette parcelle ?')) deleteMutation.mutate();
            }}
            disabled={deleteMutation.isPending}
            className="px-6 py-2 border border-red-600 text-red-600 rounded-lg font-medium hover:bg-red-50"
          >
            Supprimer
          </button>
        </div>
      </form>
        </>
      )}

      {tab === 'sol' && (
        <SoilProfileForm parcelId={id} />
      )}

      {tab === 'meteo' && (
        <div className="mb-8">
          <ParcelWeatherPanel
            parcelId={id}
            parcelName={parcel.name}
            hasCoordinates={parcel.latitude != null && parcel.longitude != null}
          />
        </div>
      )}

      {tab === 'recos' && (
        <ParcelRecommendationPanel parcelId={id} />
      )}
    </div>
  );
}
