'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';

const SENSOR_TYPES = [
  { value: 'SOIL_PH', label: 'pH sol' },
  { value: 'SOIL_MOISTURE', label: 'Humidité sol' },
  { value: 'SOIL_SALINITY', label: 'Salinité' },
  { value: 'WEATHER_STATION', label: 'Station météo' },
];

export default function NewCapteurPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [type, setType] = useState('SOIL_MOISTURE');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [parcelId, setParcelId] = useState('');

  const { data: parcels, isLoading: parcelsLoading } = useQuery({
    queryKey: ['sensor-parcels'],
    queryFn: () => adminApi.getSensorParcels(),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; type: string; model?: string; serialNumber?: string; parcelId: string }) =>
      adminApi.createSensor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sensors'] });
      router.push('/capteurs');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !parcelId) return;
    createMutation.mutate({
      name: name.trim(),
      type,
      model: model.trim() || undefined,
      serialNumber: serialNumber.trim() || undefined,
      parcelId,
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Link
        href="/capteurs"
        className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-800"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux capteurs
      </Link>

      <h1 className="text-2xl font-bold text-stone-800">Nouveau capteur</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Nom *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Capteur humidité parcelle A"
            required
            className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Type *</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
          >
            {SENSOR_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Modèle</label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Ex: Soil Moisture Pro v2"
            className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Numéro de série</label>
          <input
            type="text"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            placeholder="Ex: SN-2024-001"
            className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Parcelle *</label>
          <select
            value={parcelId}
            onChange={(e) => setParcelId(e.target.value)}
            required
            disabled={parcelsLoading}
            className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Sélectionner une parcelle</option>
            {parcels?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.farmName} ({p.regionName})
              </option>
            ))}
          </select>
          {parcels?.length === 0 && !parcelsLoading && (
            <p className="text-amber-600 text-sm mt-1">Aucune parcelle disponible. Créez d&apos;abord des parcelles.</p>
          )}
        </div>

        {createMutation.isError && (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm">
            {createMutation.error instanceof Error ? createMutation.error.message : 'Erreur'}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={createMutation.isPending || !name.trim() || !parcelId}
            className="px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? 'Création...' : 'Créer le capteur'}
          </button>
          <Link
            href="/capteurs"
            className="px-6 py-2.5 border border-stone-200 rounded-xl hover:bg-stone-50"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
