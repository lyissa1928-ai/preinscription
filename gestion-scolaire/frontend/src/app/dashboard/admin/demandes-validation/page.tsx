'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BackLink } from '@/components/ui/back-link';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

type PendingData = {
  filieres: Array<{ id: string; code: string; nom: string }>;
  formations: Array<{ id: string; code: string; nom: string; filiere: { code: string; nom: string } }>;
  semestres: Array<{ id: string; numero: number; formation: { id: string; code: string; filiere: { code: string } } }>;
  maquettes: Array<{ id: string; code: string; anneeRef: number; semestre: { numero: number; formation: { id: string; code: string; filiere: { code: string } } } }>;
  ues: Array<{ id: string; code: string; nom: string; maquette: { id: string; semestre: { formation: { id: string } } } }>;
};

export default function DemandesValidationPage() {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<PendingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      const { role: r } = JSON.parse(u);
      setRole(r);
      if (r !== 'ADMIN' && r !== 'SUPER_ADMIN') router.replace('/dashboard/admin');
    }
  }, [router]);

  const load = () => {
    api<PendingData>('/formations/demandes-validation/pending')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') load();
  }, [role]);

  const approve = async (type: string, id: string) => {
    setProcessing(`${type}-${id}`);
    try {
      await api(`/formations/demandes-validation/${type}/${id}/approve`, { method: 'PATCH' });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setProcessing(null);
    }
  };

  const reject = async (type: string, id: string) => {
    setProcessing(`${type}-${id}`);
    try {
      await api(`/formations/demandes-validation/${type}/${id}/reject`, { method: 'PATCH' });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setProcessing(null);
    }
  };

  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') return null;

  const total =
    (data?.filieres?.length ?? 0) +
    (data?.formations?.length ?? 0) +
    (data?.semestres?.length ?? 0) +
    (data?.maquettes?.length ?? 0) +
    (data?.ues?.length ?? 0);

  return (
    <div>
      <BackLink href="/dashboard/admin" className="text-sm text-slate-600 hover:text-slate-800 mb-2 inline-block">
        ← Retour
      </BackLink>
      <h1 className="text-2xl font-bold text-slate-800">Demandes de validation</h1>
      <p className="mt-2 text-slate-600">
        Créations par la scolarité en attente d&apos;approbation (Filières, Formations, Semestres, Maquettes, UE)
      </p>

      {loading ? (
        <p className="mt-6 text-slate-500">Chargement...</p>
      ) : total === 0 ? (
        <p className="mt-6 text-slate-500">Aucune demande en attente</p>
      ) : (
        <div className="mt-6 space-y-8">
          {data?.filieres?.length
            ? (
              <section>
                <h2 className="text-lg font-semibold mb-3">Filières</h2>
                <div className="space-y-2">
                  {data.filieres.map((f) => (
                    <div key={f.id} className="flex items-center justify-between bg-amber-50 p-3 rounded border border-amber-200">
                      <span className="font-medium">{f.code} — {f.nom}</span>
                      <div className="flex gap-2">
                        <button onClick={() => approve('filieres', f.id)} disabled={!!processing} className="px-3 py-1 bg-green-600 text-white rounded text-sm disabled:opacity-50">Approuver</button>
                        <button onClick={() => reject('filieres', f.id)} disabled={!!processing} className="px-3 py-1 bg-red-600 text-white rounded text-sm disabled:opacity-50">Rejeter</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )
            : null}

          {data?.formations?.length
            ? (
              <section>
                <h2 className="text-lg font-semibold mb-3">Formations</h2>
                <div className="space-y-2">
                  {data.formations.map((f) => (
                    <div key={f.id} className="flex items-center justify-between bg-amber-50 p-3 rounded border border-amber-200">
                      <span>{f.code} — {f.nom} ({f.filiere?.code})</span>
                      <div className="flex gap-2">
                        <Link href={`/dashboard/scolarite/formations/${f.id}`} className="px-3 py-1 bg-slate-200 rounded text-sm">Voir</Link>
                        <button onClick={() => approve('formations', f.id)} disabled={!!processing} className="px-3 py-1 bg-green-600 text-white rounded text-sm disabled:opacity-50">Approuver</button>
                        <button onClick={() => reject('formations', f.id)} disabled={!!processing} className="px-3 py-1 bg-red-600 text-white rounded text-sm disabled:opacity-50">Rejeter</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )
            : null}

          {data?.semestres?.length
            ? (
              <section>
                <h2 className="text-lg font-semibold mb-3">Semestres</h2>
                <div className="space-y-2">
                  {data.semestres.map((s) => (
                    <div key={s.id} className="flex items-center justify-between bg-amber-50 p-3 rounded border border-amber-200">
                      <span>Semestre {s.numero} — {s.formation?.code}</span>
                      <div className="flex gap-2">
                        <Link href={`/dashboard/scolarite/formations/${s.formation?.id}`} className="px-3 py-1 bg-slate-200 rounded text-sm">Voir</Link>
                        <button onClick={() => approve('semestres', s.id)} disabled={!!processing} className="px-3 py-1 bg-green-600 text-white rounded text-sm disabled:opacity-50">Approuver</button>
                        <button onClick={() => reject('semestres', s.id)} disabled={!!processing} className="px-3 py-1 bg-red-600 text-white rounded text-sm disabled:opacity-50">Rejeter</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )
            : null}

          {data?.maquettes?.length
            ? (
              <section>
                <h2 className="text-lg font-semibold mb-3">Maquettes</h2>
                <div className="space-y-2">
                  {data.maquettes.map((m) => (
                    <div key={m.id} className="flex items-center justify-between bg-amber-50 p-3 rounded border border-amber-200">
                      <span>{m.code} — S{m.semestre?.numero} ({m.anneeRef})</span>
                      <div className="flex gap-2">
                        <Link href={`/dashboard/scolarite/formations/${m.semestre?.formation?.id}/maquettes/${m.id}`} className="px-3 py-1 bg-slate-200 rounded text-sm">Voir</Link>
                        <button onClick={() => approve('maquettes', m.id)} disabled={!!processing} className="px-3 py-1 bg-green-600 text-white rounded text-sm disabled:opacity-50">Approuver</button>
                        <button onClick={() => reject('maquettes', m.id)} disabled={!!processing} className="px-3 py-1 bg-red-600 text-white rounded text-sm disabled:opacity-50">Rejeter</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )
            : null}

          {data?.ues?.length
            ? (
              <section>
                <h2 className="text-lg font-semibold mb-3">Unités d&apos;enseignement (UE)</h2>
                <div className="space-y-2">
                  {data.ues.map((ue) => (
                    <div key={ue.id} className="flex items-center justify-between bg-amber-50 p-3 rounded border border-amber-200">
                      <span>{ue.code} — {ue.nom}</span>
                      <div className="flex gap-2">
                        <Link href={`/dashboard/scolarite/formations/${ue.maquette?.semestre?.formation?.id}/maquettes/${ue.maquette?.id}`} className="px-3 py-1 bg-slate-200 rounded text-sm">Voir maquette</Link>
                        <button onClick={() => approve('ues', ue.id)} disabled={!!processing} className="px-3 py-1 bg-green-600 text-white rounded text-sm disabled:opacity-50">Approuver</button>
                        <button onClick={() => reject('ues', ue.id)} disabled={!!processing} className="px-3 py-1 bg-red-600 text-white rounded text-sm disabled:opacity-50">Rejeter</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )
            : null}
        </div>
      )}
    </div>
  );
}
