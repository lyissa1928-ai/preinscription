'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { farmerApi } from '@/lib/api';

interface SoilProfileFormProps {
  parcelId: string;
}

export function SoilProfileForm({ parcelId }: SoilProfileFormProps) {
  const queryClient = useQueryClient();
  const [ph, setPh] = useState('');
  const [soilMoisture, setSoilMoisture] = useState('');
  const [salinity, setSalinity] = useState('');
  const [error, setError] = useState('');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['soil-profile', parcelId],
    queryFn: () => farmerApi.getSoilProfile(parcelId),
  });

  useEffect(() => {
    if (profile) {
      setPh(profile.ph != null ? String(profile.ph) : '');
      setSoilMoisture(profile.soilMoisture != null ? String(profile.soilMoisture) : '');
      setSalinity(profile.salinity != null ? String(profile.salinity) : '');
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: () =>
      farmerApi.updateSoilProfile(parcelId, {
        ph: ph ? parseFloat(ph) : null,
        soilMoisture: soilMoisture ? parseFloat(soilMoisture) : null,
        salinity: salinity ? parseFloat(salinity) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['soil-profile', parcelId] });
      queryClient.invalidateQueries({ queryKey: ['parcel', parcelId] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const p = ph ? parseFloat(ph) : null;
    const m = soilMoisture ? parseFloat(soilMoisture) : null;
    const s = salinity ? parseFloat(salinity) : null;
    if (p != null && (p < 0 || p > 14)) {
      setError('pH doit etre entre 0 et 14');
      return;
    }
    if (m != null && (m < 0 || m > 100)) {
      setError('Humidite doit etre entre 0 et 100 %');
      return;
    }
    if (s != null && s < 0) {
      setError('La salinite doit etre >= 0');
      return;
    }
    updateMutation.mutate();
  };

  if (isLoading) {
    return <div className="bg-white rounded-xl shadow p-6 animate-pulse h-64" />;
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="font-semibold text-gray-800 mb-2">Profil sol</h3>
      <p className="text-gray-600 text-sm mb-4">
        Renseignez les parametres du sol pour ameliorer les recommandations.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">pH (0-14)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="14"
            value={ph}
            onChange={(e) => setPh(e.target.value)}
            placeholder="Ex: 6.5"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Humidite sol (%)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={soilMoisture}
            onChange={(e) => setSoilMoisture(e.target.value)}
            placeholder="Ex: 45"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Salinite (dS/m)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={salinity}
            onChange={(e) => setSalinity(e.target.value)}
            placeholder="Ex: 2"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
        >
          Enregistrer
        </button>
      </form>
    </div>
  );
}
