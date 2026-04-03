'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { farmerApi, regionsApi } from '@/lib/api';
import { farmCreateSchema, FARMING_TYPES } from '@agriculture/shared';
import { useAuth } from '@/hooks/use-auth';
import { Pencil, Trash2 } from 'lucide-react';

export default function FarmPage() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    regionId: '',
    farmingType: 'RAINFED',
    description: '',
  });

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: () => regionsApi.list(),
  });

  const { data: farm, isLoading, isError } = useQuery({
    queryKey: ['farm'],
    queryFn: async () => {
      try {
        return await farmerApi.getFarm();
      } catch {
        return null;
      }
    },
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      farmerApi.createFarm({
        name: data.name,
        phone: data.phone || undefined,
        regionId: data.regionId,
        farmingType: data.farmingType,
        description: data.description || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farm'] });
      setError('');
      setSuccess('Exploitation créée avec succès.');
      setTimeout(() => setSuccess(''), 4000);
    },
    onError: (e: Error) => {
      setError(e.message);
      setSuccess('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof form) =>
      farmerApi.updateFarm({
        name: data.name,
        phone: data.phone || undefined,
        regionId: data.regionId,
        farmingType: data.farmingType,
        description: data.description || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farm'] });
      setError('');
      setSuccess('Exploitation mise à jour avec succès.');
      setTimeout(() => setSuccess(''), 4000);
    },
    onError: (e: Error) => {
      setError(e.message);
      setSuccess('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => farmerApi.deleteFarm(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farm'] });
      queryClient.invalidateQueries({ queryKey: ['parcels'] });
      queryClient.invalidateQueries({ queryKey: ['farmer-dashboard'] });
      setForm({ name: '', phone: '', regionId: '', farmingType: 'RAINFED', description: '' });
      setError('');
      setSuccess('Exploitation supprimée.');
      setTimeout(() => setSuccess(''), 4000);
    },
    onError: (e: Error) => {
      setError(e.message);
      setSuccess('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const parsed = farmCreateSchema.safeParse({
      ...form,
      phone: form.phone || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Données invalides');
      return;
    }
    if (hasFarm) {
      updateMutation.mutate(form);
    } else {
      createMutation.mutate(form);
    }
  };

  useEffect(() => {
    if (farm?.name) {
      setForm((prev) =>
        prev.name ? prev : {
          name: farm.name,
          phone: farm.phone ?? '',
          regionId: farm.regionId,
          farmingType: farm.farmingType,
          description: farm.description ?? '',
        }
      );
    }
  }, [farm]);

  const [showForm, setShowForm] = useState(false);
  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const hasFarm = farm != null;

  // Inclure la région de l'exploitation existante si elle n'est plus dans la liste (ex: désactivée)
  const regionOptions = regions ?? [];
  const regionOptionsWithFarm = farm?.region && !regionOptions.some((r) => r.id === farm.regionId)
    ? [{ id: farm.regionId, name: farm.region.name, zone: farm.region.zone }, ...regionOptions]
    : regionOptions;

  return (
    <div className="space-y-6">
      {currentUser && (
        <p className="text-sm text-stone-500 mb-2">
          Exploitation de <span className="font-medium text-stone-700">{currentUser.email}</span>
        </p>
      )}
      <h1 className="text-2xl font-bold text-stone-800">Mon exploitation</h1>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm">{error}</div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-sm">{success}</div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-stone-100 p-6 animate-pulse h-64" />
      ) : hasFarm ? (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
            <h2 className="text-lg font-semibold text-stone-800 mb-4">Exploitation créée</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-stone-500">Nom</dt>
                <dd className="font-medium text-stone-800">{farm.name}</dd>
              </div>
              <div>
                <dt className="text-stone-500">Téléphone</dt>
                <dd className="font-medium text-stone-800">{farm.phone ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-stone-500">Région</dt>
                <dd className="font-medium text-stone-800">{farm.region?.name ?? '-'} ({farm.region?.zone ?? '-'})</dd>
              </div>
              <div>
                <dt className="text-stone-500">Type</dt>
                <dd className="font-medium text-stone-800">{farm.farmingType}</dd>
              </div>
              {farm.description && (
                <div className="sm:col-span-2">
                  <dt className="text-stone-500">Description</dt>
                  <dd className="text-stone-800">{farm.description}</dd>
                </div>
              )}
            </dl>
            <div className="flex gap-3 mt-6 pt-4 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setShowForm(!showForm)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                <Pencil className="w-4 h-4" />
                Modifier
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Supprimer l\'exploitation ? Les parcelles associées seront également supprimées.')) {
                    deleteMutation.mutate();
                  }
                }}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer
              </button>
            </div>
          </div>

          {showForm && (
            <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
              <h2 className="text-lg font-semibold text-stone-800 mb-4">Modifier l&apos;exploitation</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Nom</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Téléphone</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="+221 XX XXX XX XX"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Région</label>
            <select
              value={form.regionId}
              onChange={(e) => setForm((f) => ({ ...f, regionId: e.target.value }))}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
            >
              <option value="">Sélectionner</option>
              {regionOptionsWithFarm.map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.zone})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Type d&apos;exploitation</label>
            <select
              value={form.farmingType}
              onChange={(e) => setForm((f) => ({ ...f, farmingType: e.target.value }))}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              {FARMING_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              rows={3}
            />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 py-3 border border-stone-200 rounded-xl font-medium text-stone-600 hover:bg-stone-50"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 max-w-xl space-y-4"
        >
          <h2 className="text-lg font-semibold text-stone-800">Créer mon exploitation</h2>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Nom</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Téléphone</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="+221 XX XXX XX XX"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Région</label>
            <select
              value={form.regionId}
              onChange={(e) => setForm((f) => ({ ...f, regionId: e.target.value }))}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
            >
              <option value="">Sélectionner</option>
              {regionOptionsWithFarm.map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.zone})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Type d&apos;exploitation</label>
            <select
              value={form.farmingType}
              onChange={(e) => setForm((f) => ({ ...f, farmingType: e.target.value }))}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              {FARMING_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              rows={3}
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            Créer l&apos;exploitation
          </button>
        </form>
      )}
    </div>
  );
}
