'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { BackLink } from '@/components/ui/back-link';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';

type Person = {
  id: string;
  matricule: string;
  user?: { firstName: string; lastName: string; email: string };
  student?: {
    statutInscription: string;
    telephone?: string | null;
    adresse?: string | null;
    nomTuteur?: string | null;
    telephoneParent?: string | null;
    telephoneTuteur?: string | null;
    lienParente?: string | null;
    groupeSanguin?: string | null;
    antecedentsMedicaux?: string | null;
    maladiesSignalees?: string | null;
  };
};

export default function EditEtudiantPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = params.id as string;
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    statutInscription: 'en_attente',
    telephone: '',
    adresse: '',
    nomTuteur: '',
    telephoneParent: '',
    telephoneTuteur: '',
    lienParente: '',
    groupeSanguin: '',
    antecedentsMedicaux: '',
    maladiesSignalees: '',
  });

  useEffect(() => {
    if (!id) return;
    api<Person>(`/persons/${id}`)
      .then((p) => {
        setPerson(p);
        setForm({
          firstName: p.user?.firstName ?? '',
          lastName: p.user?.lastName ?? '',
          email: p.user?.email ?? '',
          statutInscription: p.student?.statutInscription ?? 'en_attente',
          telephone: p.student?.telephone ?? '',
          adresse: p.student?.adresse ?? '',
          nomTuteur: p.student?.nomTuteur ?? '',
          telephoneParent: p.student?.telephoneParent ?? '',
          telephoneTuteur: p.student?.telephoneTuteur ?? '',
          lienParente: p.student?.lienParente ?? '',
          groupeSanguin: p.student?.groupeSanguin ?? '',
          antecedentsMedicaux: p.student?.antecedentsMedicaux ?? '',
          maladiesSignalees: p.student?.maladiesSignalees ?? '',
        });
      })
      .catch(() => setPerson(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!person) return;
    setSaving(true);
    try {
      await api(`/persons/students/${person.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          firstName: form.firstName || undefined,
          lastName: form.lastName || undefined,
          email: form.email || undefined,
          statutInscription: form.statutInscription,
          telephone: form.telephone || undefined,
          adresse: form.adresse || undefined,
          nomTuteur: form.nomTuteur || undefined,
          telephoneParent: form.telephoneParent || undefined,
          telephoneTuteur: form.telephoneTuteur || undefined,
          lienParente: form.lienParente || undefined,
          groupeSanguin: form.groupeSanguin || undefined,
          antecedentsMedicaux: form.antecedentsMedicaux || undefined,
          maladiesSignalees: form.maladiesSignalees || undefined,
        }),
      });
      router.push(`/dashboard/scolarite/etudiants/${person.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-slate-500">Chargement...</div>;
  if (!person) {
    return (
      <div>
        <p className="text-slate-500">Étudiant non trouvé.</p>
        <BackLink href="/dashboard/scolarite/etudiants" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">← Retour</BackLink>
      </div>
    );
  }

  return (
    <div>
      <BackLink href={`/dashboard/scolarite/etudiants/${person.id}`} className="text-sm text-blue-600 hover:text-blue-700 mb-4 inline-block">← Retour au profil</BackLink>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Modifier l&apos;étudiant · {person.matricule}</h1>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <section className="bg-white rounded-lg border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-800 mb-3">Identité</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm text-slate-600">Prénom</span>
              <input type="text" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-sm text-slate-600">Nom</span>
              <input type="text" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm text-slate-600">Email</span>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm" />
            </label>
          </div>
        </section>

        <section className="bg-white rounded-lg border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-800 mb-3">Statut & contact</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm text-slate-600">Statut inscription</span>
              <select value={form.statutInscription} onChange={(e) => setForm((f) => ({ ...f, statutInscription: e.target.value }))} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm">
                <option value="en_attente">En attente</option>
                <option value="valide">Inscrit</option>
                <option value="incomplet">Incomplet</option>
                <option value="suspendu">Suspendu</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm text-slate-600">Téléphone</span>
              <input type="text" value={form.telephone} onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm text-slate-600">Adresse</span>
              <input type="text" value={form.adresse} onChange={(e) => setForm((f) => ({ ...f, adresse: e.target.value }))} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-sm text-slate-600">Nom tuteur</span>
              <input type="text" value={form.nomTuteur} onChange={(e) => setForm((f) => ({ ...f, nomTuteur: e.target.value }))} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-sm text-slate-600">Tél. parent</span>
              <input type="text" value={form.telephoneParent} onChange={(e) => setForm((f) => ({ ...f, telephoneParent: e.target.value }))} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-sm text-slate-600">Tél. tuteur</span>
              <input type="text" value={form.telephoneTuteur} onChange={(e) => setForm((f) => ({ ...f, telephoneTuteur: e.target.value }))} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-sm text-slate-600">Lien parenté</span>
              <input type="text" value={form.lienParente} onChange={(e) => setForm((f) => ({ ...f, lienParente: e.target.value }))} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-sm text-slate-600">Groupe sanguin</span>
              <input type="text" value={form.groupeSanguin} onChange={(e) => setForm((f) => ({ ...f, groupeSanguin: e.target.value }))} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm text-slate-600">Antécédents médicaux</span>
              <textarea value={form.antecedentsMedicaux} onChange={(e) => setForm((f) => ({ ...f, antecedentsMedicaux: e.target.value }))} rows={2} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm text-slate-600">Maladies signalées</span>
              <textarea value={form.maladiesSignalees} onChange={(e) => setForm((f) => ({ ...f, maladiesSignalees: e.target.value }))} rows={2} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm" />
            </label>
          </div>
        </section>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50">
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <Link href={`/dashboard/scolarite/etudiants/${person.id}`} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Annuler</Link>
        </div>
      </form>
    </div>
  );
}
