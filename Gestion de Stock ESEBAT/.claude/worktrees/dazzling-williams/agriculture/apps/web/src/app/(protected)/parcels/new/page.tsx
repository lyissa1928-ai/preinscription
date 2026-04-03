'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { farmerApi, regionsApi } from '@/lib/api';
import { parcelCreateSchema } from '@agriculture/shared';
import { SOIL_TYPES, PARCEL_STATUSES } from '@agriculture/shared';

export default function NewParcelPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
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

  const createMutation = useMutation({
    mutationFn: () =>
      farmerApi.createParcel({
        name: form.name,
        area: parseFloat(form.area),
        regionId: form.regionId,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        soilType: form.soilType,
        status: form.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcels'] });
      queryClient.invalidateQueries({ queryKey: ['farmer-dashboard'] });
      router.push('/parcels');
    },
    onError: (e: Error) => setError(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = parcelCreateSchema.safeParse({
      ...form,
      area: parseFloat(form.area),
      latitude: form.latitude ? parseFloat(form.latitude) : undefined,
      longitude: form.longitude ? parseFloat(form.longitude) : undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Données invalides');
      return;
    }
    createMutation.mutate();
  };

  return (
    <div>
      <div className="mb-6">
        <Link href="/parcels" className="text-emerald-600 hover:underline">
          ← Retour aux parcelles
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Nouvelle parcelle</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 max-w-xl space-y-4">
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm">{error}</div>
        )}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Nom</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Superficie (ha)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={form.area}
            onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
            className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Région</label>
          <select
            value={form.regionId}
            onChange={(e) => setForm((f) => ({ ...f, regionId: e.target.value }))}
            className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            required
          >
            <option value="">Sélectionner</option>
            {regions?.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Type de sol</label>
          <select
            value={form.soilType}
            onChange={(e) => setForm((f) => ({ ...f, soilType: e.target.value }))}
            className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            {SOIL_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Statut</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            {PARCEL_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Latitude (optionnel)</label>
            <input
              type="number"
              step="any"
              value={form.latitude}
              onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
              className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="-90 à 90"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Longitude (optionnel)</label>
            <input
              type="number"
              step="any"
              value={form.longitude}
              onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
              className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="-180 à 180"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          Créer
        </button>
      </form>
    </div>
  );
}
