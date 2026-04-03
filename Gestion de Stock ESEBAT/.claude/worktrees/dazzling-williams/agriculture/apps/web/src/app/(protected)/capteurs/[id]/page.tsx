'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type SensorDTO } from '@/lib/api';
import { ArrowLeft, Copy, RefreshCw } from 'lucide-react';

const SENSOR_TYPES = [
  { value: 'SOIL_PH', label: 'pH sol' },
  { value: 'SOIL_MOISTURE', label: 'Humidité sol' },
  { value: 'SOIL_SALINITY', label: 'Salinité' },
  { value: 'WEATHER_STATION', label: 'Station météo' },
];

export default function EditCapteurPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const { data: sensor, isLoading } = useQuery({
    queryKey: ['sensor', id],
    queryFn: () => adminApi.getSensor(id),
    enabled: !!id,
  });

  const { data: parcels } = useQuery({
    queryKey: ['sensor-parcels'],
    queryFn: () => adminApi.getSensorParcels(),
  });

  const [name, setName] = useState('');
  const [type, setType] = useState('SOIL_MOISTURE');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [parcelId, setParcelId] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (sensor) {
      setName(sensor.name);
      setType(sensor.type);
      setModel(sensor.model ?? '');
      setSerialNumber(sensor.serialNumber ?? '');
      setParcelId(sensor.parcelId);
      setIsActive(sensor.isActive);
    }
  }, [sensor]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<{ name: string; type: string; model: string; serialNumber: string; parcelId: string; isActive: boolean }>) =>
      adminApi.updateSensor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sensor', id] });
      queryClient.invalidateQueries({ queryKey: ['sensors'] });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: () => adminApi.regenerateSensorKey(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sensor', id] });
      if (typeof window !== 'undefined') {
        navigator.clipboard.writeText(data.apiKey);
        alert('Nouvelle clé copiée dans le presse-papiers. L\'ancienne clé ne fonctionne plus.');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ name, type, model: model || undefined, serialNumber: serialNumber || undefined, parcelId, isActive });
  };

  const copyApiKey = () => {
    if (sensor?.apiKey) {
      navigator.clipboard.writeText(sensor.apiKey);
      alert('Clé API copiée dans le presse-papiers.');
    }
  };

  if (isLoading || !sensor) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-stone-200 rounded animate-pulse" />
        <div className="h-64 bg-white rounded-2xl border border-stone-100 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Link
        href="/capteurs"
        className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-800"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux capteurs
      </Link>

      <h1 className="text-2xl font-bold text-stone-800">Modifier le capteur</h1>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
        <h2 className="font-semibold text-amber-800 mb-2">Clé API</h2>
        <p className="text-sm text-amber-700 mb-3">
          Utilisez cette clé dans le header <code className="bg-amber-100 px-1 rounded">X-Sensor-Api-Key</code> pour envoyer les données vers <code className="bg-amber-100 px-1 rounded">POST /iot/ingest</code>.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-4 py-2 bg-white border border-amber-200 rounded-xl text-sm font-mono truncate">
            {sensor.apiKey}
          </code>
          <button
            type="button"
            onClick={copyApiKey}
            className="p-2 rounded-lg hover:bg-amber-100 transition"
            title="Copier"
          >
            <Copy className="w-5 h-5 text-amber-700" />
          </button>
          <button
            type="button"
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending}
            className="inline-flex items-center gap-2 px-3 py-2 text-amber-800 hover:bg-amber-100 rounded-lg text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Régénérer
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Nom *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
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
            className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Numéro de série</label>
          <input
            type="text"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Parcelle *</label>
          <select
            value={parcelId}
            onChange={(e) => setParcelId(e.target.value)}
            required
            className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
          >
            {parcels?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.farmName} ({p.regionName})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-stone-700">
            Capteur actif (accepte les données)
          </label>
        </div>

        <p className="text-stone-500 text-sm">
          Dernière lecture : {sensor.lastReadingAt ? new Date(sensor.lastReadingAt).toLocaleString('fr-FR') : 'Jamais'}
        </p>

        {updateMutation.isError && (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm">
            {updateMutation.error instanceof Error ? updateMutation.error.message : 'Erreur'}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
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
