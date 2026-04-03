'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { MapPin, Plus, TrendingUp, Layers, ArrowRight, Warehouse, Sprout, Bell, Users } from 'lucide-react';
import { farmerApi, adminApi, type ParcelDTO } from '@/lib/api';
import { DashboardWeatherWidget } from '@/components/weather/DashboardWeatherWidget';
import { DashboardAlertsWidget } from '@/components/alerts/DashboardAlertsWidget';
import { useAuth, getRoleLabel } from '@/hooks/use-auth';

function AdminDashboard() {
  const { currentUser } = useAuth();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats(),
    enabled: currentUser?.role === 'ADMIN',
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">Tableau de bord</h1>
      {currentUser && (
        <p className="text-sm text-stone-500">
          Connecté en tant que <span className="font-medium text-stone-700">{getRoleLabel(currentUser.role)}</span> · {currentUser.email}
        </p>
      )}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
        <p className="text-stone-600 mb-6">
          Gérez la plateforme : utilisateurs, référentiels, règles et audit.
        </p>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition"
        >
          Accéder à l&apos;administration
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
      {!isLoading && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { key: 'totalUsers', label: 'Utilisateurs', icon: Users },
            { key: 'totalFarms', label: 'Exploitations', icon: Warehouse },
            { key: 'totalParcels', label: 'Parcelles', icon: MapPin },
            { key: 'totalRegions', label: 'Régions', icon: MapPin },
            { key: 'totalCrops', label: 'Cultures', icon: Sprout },
            { key: 'openAlerts', label: 'Alertes ouvertes', icon: Bell },
          ].map(({ key, label, icon: Icon }) => (
            <Link
              key={key}
              href="/admin"
              className="flex items-center gap-3 p-4 rounded-xl border border-stone-100 hover:bg-stone-50 transition"
            >
              <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center">
                <Icon className="w-5 h-5 text-stone-600" />
              </div>
              <div>
                <p className="text-xs text-stone-500">{label}</p>
                <p className="text-lg font-bold text-stone-800">{(stats as Record<string, number>)[key] ?? 0}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AgronomistTechnicianDashboard() {
  const { currentUser } = useAuth();
  const isAgronomist = currentUser?.role === 'AGRONOMIST';

  const { data: cropsData } = useQuery({
    queryKey: ['admin-crops-count'],
    queryFn: () => adminApi.getCrops({ limit: 1 }),
    enabled: !!isAgronomist,
  });
  const { data: reqData } = useQuery({
    queryKey: ['admin-crop-req-count'],
    queryFn: () => adminApi.getCropRequirements({ limit: 1 }),
    enabled: !!isAgronomist,
  });
  const { data: regionsData } = useQuery({
    queryKey: ['admin-regions-count'],
    queryFn: () => adminApi.getRegions({ limit: 1 }),
  });
  const { data: rulesData } = useQuery({
    queryKey: ['admin-alert-rules-count'],
    queryFn: () => adminApi.getAlertRules({ limit: 1 }),
    enabled: !isAgronomist,
  });

  const links = isAgronomist
    ? [
        { href: '/consultation/crops', label: 'Cultures', icon: Sprout, count: cropsData?.meta?.total },
        { href: '/consultation/exigences', label: 'Exigences agronomiques', icon: Layers, count: reqData?.meta?.total },
        { href: '/consultation/regions', label: 'Régions', icon: MapPin, count: regionsData?.meta?.total },
      ]
    : [
        { href: '/consultation/regions', label: 'Régions', icon: MapPin, count: regionsData?.meta?.total },
        { href: '/consultation/regles-alertes', label: 'Règles alertes', icon: Bell, count: rulesData?.meta?.total },
      ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">Tableau de bord</h1>
      {currentUser && (
        <p className="text-sm text-stone-500">
          Connecté en tant que <span className="font-medium text-stone-700">{getRoleLabel(currentUser.role)}</span> · {currentUser.email}
        </p>
      )}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8">
        <p className="text-stone-600 mb-6">
          {isAgronomist
            ? 'Consultez le catalogue des cultures, les exigences agronomiques et les régions pour accompagner les agriculteurs.'
            : 'Consultez les régions et les règles d\'alertes pour le suivi terrain.'}
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {links.map(({ href, label, icon: Icon, count }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 p-4 rounded-xl border border-stone-100 hover:bg-emerald-50 hover:border-emerald-100 transition"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Icon className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-stone-800 block">{label}</span>
                {count != null && <span className="text-sm text-stone-500">{count} entrée{count !== 1 ? 's' : ''}</span>}
              </div>
              <ArrowRight className="w-5 h-5 text-stone-400 shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function LastRecommendationWidget() {
  const { data } = useQuery({
    queryKey: ['farmer-recommendations-last'],
    queryFn: () => farmerApi.getAllRecommendations(1, 1),
  });
  const rec = data?.data?.[0];
  if (!rec) return null;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
      <h2 className="text-lg font-semibold text-stone-800 mb-2">Dernière recommandation</h2>
      <p className="text-stone-600 text-sm mb-2">
        {new Date(rec.generatedAt).toLocaleDateString('fr-FR')} · {rec.topCropName ?? '-'} ({rec.topScore ?? '-'}/100)
      </p>
      <Link
        href={`/parcels/${rec.parcelId}`}
        className="inline-flex items-center gap-2 text-emerald-600 hover:underline font-medium text-sm"
      >
        Voir la parcelle
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const isFarmer = currentUser?.role === 'FARMER';

  const { data, isLoading, error } = useQuery({
    queryKey: ['farmer-dashboard'],
    queryFn: () => farmerApi.getDashboard(),
    enabled: !!isFarmer,
  });

  if (currentUser && currentUser.role === 'ADMIN') {
    return <AdminDashboard />;
  }

  if (currentUser && ['AGRONOMIST', 'TECHNICIAN'].includes(currentUser.role)) {
    return <AgronomistTechnicianDashboard />;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-stone-200 rounded-lg animate-pulse" />
          <div className="h-10 w-32 bg-stone-200 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-100 p-6 h-28 animate-pulse" />
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-stone-100 p-6 h-64 animate-pulse" />
      </div>
    );
  }

  if (error) {
    const msg = error instanceof Error ? error.message : 'Erreur';
    return (
      <div>
        <h1 className="text-2xl font-bold text-stone-800 mb-4">Tableau de bord</h1>
        <div className="p-4 bg-amber-50 text-amber-800 rounded-xl border border-amber-100 mb-4">
          {msg}
        </div>
        {msg.includes('exploitation') && (
          <Link href="/farm" className="text-emerald-600 hover:underline font-medium">
            Créer mon exploitation →
          </Link>
        )}
      </div>
    );
  }

  const { farm, stats, recentParcels } = data ?? { farm: null, stats: null, recentParcels: [] };
  const mainParcel = recentParcels.find((p: ParcelDTO) => p.latitude != null && p.longitude != null);

  return (
    <div className="space-y-6">
      {currentUser && (
        <p className="text-sm text-stone-500">
          Données de <span className="font-medium text-stone-700">{currentUser.email}</span>
        </p>
      )}
      {!farm && (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl">
          <p className="font-medium text-amber-800">Créez votre exploitation pour accéder aux parcelles et alertes.</p>
          <Link href="/farm" className="inline-flex items-center gap-2 mt-2 text-emerald-600 hover:underline font-medium">
            Créer mon exploitation
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
      {farm && (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Warehouse className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-stone-800">Mon exploitation</h2>
                <p className="text-stone-600 font-medium">{farm.name}</p>
                <p className="text-sm text-stone-500">
                  {farm.region?.name ?? '-'} ({farm.region?.zone ?? '-'}) · {farm.farmingType}
                </p>
              </div>
            </div>
            <Link
              href="/farm"
              className="px-4 py-2 text-emerald-600 hover:bg-emerald-50 rounded-xl font-medium text-sm transition"
            >
              Modifier
            </Link>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-stone-800">Tableau de bord</h1>
        <Link
          href="/parcels/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition shadow-sm"
          style={{ visibility: farm ? 'visible' : 'hidden' }}
        >
          <Plus className="w-5 h-5" />
          Ajouter parcelle
        </Link>
      </div>

      {farm && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Link
            href="/parcels/new"
            className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-200 flex items-center justify-center">
              <Plus className="w-5 h-5 text-emerald-700" />
            </div>
            <span className="font-medium text-stone-800">Ajouter parcelle</span>
          </Link>
          <Link
            href="/alerts"
            className="flex items-center gap-3 p-4 rounded-xl border border-stone-100 hover:bg-stone-50 transition"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-600" />
            </div>
            <span className="font-medium text-stone-800">Voir mes alertes</span>
          </Link>
          <Link
            href="/parcels"
            className="flex items-center gap-3 p-4 rounded-xl border border-stone-100 hover:bg-stone-50 transition"
          >
            <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-sky-600" />
            </div>
            <span className="font-medium text-stone-800">Mes parcelles</span>
          </Link>
        </div>
      )}

      {farm && <DashboardAlertsWidget />}

      {farm && mainParcel && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-stone-800 mb-2 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            Météo · {mainParcel.name}
          </h2>
          <DashboardWeatherWidget parcelId={mainParcel.id} />
        </div>
      )}

      {farm && <LastRecommendationWidget />}

      {farm && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Layers className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-stone-500 text-sm">Parcelles</p>
              <p className="text-2xl font-bold text-stone-800">{stats?.totalParcels ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-stone-500 text-sm">Superficie totale (ha)</p>
              <p className="text-2xl font-bold text-stone-800">{stats?.totalArea?.toFixed(1) ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-stone-600" />
            </div>
            <div>
              <p className="text-stone-500 text-sm">Région principale</p>
              <p className="text-xl font-semibold text-stone-800">{stats?.mainRegion?.name ?? '-'}</p>
            </div>
          </div>
        </div>
      </div>
      )}

      {farm && (
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
        <h2 className="text-lg font-semibold text-stone-800 mb-4">Dernières parcelles</h2>
        {recentParcels.length === 0 ? (
          <p className="text-stone-500">Aucune parcelle. Ajoutez-en une pour commencer.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {recentParcels.map((p: ParcelDTO) => (
              <li key={p.id} className="py-4 flex justify-between items-center">
                <div>
                  <Link href={`/parcels/${p.id}`} className="font-medium text-emerald-700 hover:underline">
                    {p.name}
                  </Link>
                  <span className="text-stone-500 text-sm ml-2">{p.area} ha · {p.region?.name ?? ''}</span>
                </div>
                <Link
                  href={`/parcels/${p.id}`}
                  className="text-sm text-emerald-600 hover:underline flex items-center gap-1"
                >
                  Voir
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      )}
    </div>
  );
}
