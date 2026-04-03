'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, apiUpload, downloadFile } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { canWriteStructure } from '@/config/rbac';

/** Aligné sur le backend (CAN_MANAGE_STRUCTURE_ACADEMIQUE) : inclut RESPONSABLE_PEDAGOGIQUE. SCOLARITE exclu. */
const CAN_LOCK_UNLOCK = ['SUPER_ADMIN'];

type MaquetteImportRow = {
  semestreNumero: number;
  ueCode: string;
  ueNom: string;
  ueCoefficient: number;
  ueCreditsEcts: number;
  ecCode: string;
  ecNom: string;
  ecVhCm: number;
  ecVhTd: number;
  ecVhTp: number;
  ecVhTpe: number;
  ecCoefficient: number;
  ecCreditsEcts: number;
  rowIndex: number;
  errors: string[];
};

type MaquetteImportPreview = {
  rows: MaquetteImportRow[];
  totalErrors: number;
  canImport: boolean;
};

type FormationDetail = {
  id: string;
  code: string;
  nom: string;
  verrouille?: boolean;
  filiere?: { id: string; code: string; nom: string; verrouille?: boolean };
  semestres: {
    id: string;
    numero: number;
    verrouille?: boolean;
    maquettes: {
      id: string;
      code: string;
      anneeRef: number;
      verrouille?: boolean;
      semestre: { numero: number; verrouille?: boolean };
      ues: { id: string; code: string; nom: string; coefficient: number; creditsEcts: number; ecs: { id: string; code: string; nom: string; vhCm: number; vhTd: number; vhTp: number; vhTpe: number; coefficient: number; creditsEcts: number }[] }[];
    }[];
  }[];
};

export default function MaquetteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const formationId = params.id as string;
  const maquetteId = params.maquetteId as string;
  const [formation, setFormation] = useState<FormationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showUEForm, setShowUEForm] = useState(false);
  const [showECForm, setShowECForm] = useState<string | null>(null);
  const [editingUEId, setEditingUEId] = useState<string | null>(null);
  const [editingECId, setEditingECId] = useState<string | null>(null);
  const [formUE, setFormUE] = useState({ code: '', nom: '', coefficient: 1, creditsEcts: 6 });
  const [formEC, setFormEC] = useState({ code: '', nom: '', vhCm: 0, vhTd: 0, vhTp: 0, vhTpe: 0, coefficient: 1, creditsEcts: 3 });
  const [formUEEdit, setFormUEEdit] = useState({ code: '', nom: '', coefficient: 1, creditsEcts: 6 });
  const [formECEdit, setFormECEdit] = useState({ code: '', nom: '', vhCm: 0, vhTd: 0, vhTp: 0, vhTpe: 0, coefficient: 1, creditsEcts: 3 });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<MaquetteImportPreview | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  const canWrite = canWriteStructure(userRole);
  const canLockUnlock = userRole !== null && CAN_LOCK_UNLOCK.includes(userRole);
  const maquette = formation?.semestres.flatMap((s) => s.maquettes).find((m) => m.id === maquetteId);
  const semestre = formation?.semestres.find((s) => s.maquettes.some((m) => m.id === maquetteId));
  const filiereLocked = formation?.filiere?.verrouille;
  const formationLocked = formation?.verrouille;
  const semestreLocked = semestre?.verrouille;
  const readOnly = filiereLocked || formationLocked || semestreLocked || maquette?.verrouille;
  const canEditMaquette = canWrite && !readOnly;

  const load = () => {
    api<FormationDetail>(`/formations/${formationId}`)
      .then(setFormation)
      .catch(() => router.push('/dashboard/scolarite/filieres'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const u = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (u) {
      try {
        setUserRole((JSON.parse(u) as { role?: string }).role ?? '');
      } catch {
        setUserRole('');
      }
    } else {
      setUserRole('');
    }
  }, []);

  useEffect(() => {
    load();
  }, [formationId, maquetteId]);

  const handleCreateUE = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api(`/formations/maquettes/${maquetteId}/ues`, { method: 'POST', body: JSON.stringify(formUE) });
      setFormUE({ code: '', nom: '', coefficient: 1, creditsEcts: 6 });
      setShowUEForm(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleCreateEC = async (e: React.FormEvent, ueId: string) => {
    e.preventDefault();
    try {
      await api(`/formations/ues/${ueId}/ecs`, { method: 'POST', body: JSON.stringify(formEC) });
      setFormEC({ code: '', nom: '', vhCm: 0, vhTd: 0, vhTp: 0, vhTpe: 0, coefficient: 1, creditsEcts: 3 });
      setShowECForm(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleDeleteUE = async (id: string) => {
    if (!confirm('Supprimer cette UE et tout son contenu ?')) return;
    try {
      await api(`/formations/ues/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleDeleteEC = async (id: string) => {
    if (!confirm('Supprimer cet EC ?')) return;
    try {
      await api(`/formations/ecs/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleStartEditUE = (ue: { id: string; code: string; nom: string; coefficient: number; creditsEcts: number }) => {
    setEditingUEId(ue.id);
    setFormUEEdit({ code: ue.code, nom: ue.nom, coefficient: ue.coefficient, creditsEcts: ue.creditsEcts });
  };

  const handleUpdateUE = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUEId) return;
    try {
      await api(`/formations/ues/${editingUEId}`, { method: 'PATCH', body: JSON.stringify(formUEEdit) });
      setEditingUEId(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleStartEditEC = (ec: { id: string; code: string; nom: string; vhCm: number; vhTd: number; vhTp: number; vhTpe: number; coefficient: number; creditsEcts: number }) => {
    setEditingECId(ec.id);
    setFormECEdit({ code: ec.code, nom: ec.nom, vhCm: ec.vhCm, vhTd: ec.vhTd, vhTp: ec.vhTp, vhTpe: ec.vhTpe, coefficient: ec.coefficient, creditsEcts: ec.creditsEcts });
  };

  const handleUpdateEC = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingECId) return;
    try {
      await api(`/formations/ecs/${editingECId}`, { method: 'PATCH', body: JSON.stringify(formECEdit) });
      setEditingECId(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadFile(`/formations/maquettes/${maquetteId}/import/template`, 'template-maquette.xlsx');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur téléchargement');
    }
  };

  const handleDownloadTemplateCsv = async () => {
    try {
      await downloadFile(`/formations/maquettes/${maquetteId}/import/template?format=csv`, 'template-maquette.csv');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur téléchargement');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    setImportPreview(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const preview = await apiUpload<MaquetteImportPreview>(`/formations/maquettes/${maquetteId}/import/preview`, formData);
      setImportPreview(preview);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'analyse du fichier');
    } finally {
      setImportLoading(false);
      e.target.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview?.rows?.length || !importPreview.canImport) return;
    setImportLoading(true);
    try {
      await api(`/formations/maquettes/${maquetteId}/import/confirm`, {
        method: 'POST',
        body: JSON.stringify({ rows: importPreview.rows }),
      });
      setShowImportModal(false);
      setImportPreview(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'import');
    } finally {
      setImportLoading(false);
    }
  };

  if (loading || !formation || !maquette) return <p className="text-slate-500">Chargement...</p>;

  const totals = maquette.ues?.reduce(
    (acc, ue) => {
      ue.ecs?.forEach((ec) => {
        const vht = ec.vhCm + ec.vhTd + ec.vhTp + ec.vhTpe;
        acc.cm += ec.vhCm;
        acc.tp += ec.vhTp;
        acc.td += ec.vhTd;
        acc.tpe += ec.vhTpe;
        acc.vht += vht;
        acc.coef += ec.coefficient;
        acc.credits += ec.creditsEcts;
      });
      return acc;
    },
    { cm: 0, tp: 0, td: 0, tpe: 0, vht: 0, coef: 0, credits: 0 }
  ) ?? { cm: 0, tp: 0, td: 0, tpe: 0, vht: 0, coef: 0, credits: 0 };

  return (
    <div className="text-slate-900">
      <Link href={`/dashboard/scolarite/formations/${formationId}`} className="text-blue-600 hover:underline text-sm">
        ← Retour à la formation
      </Link>
      <div className="mt-2 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Semestre {maquette.semestre.numero} — {formation.code} ({maquette.anneeRef})
            {(maquette.verrouille || filiereLocked || formationLocked || semestreLocked) && <span className="ml-2 text-amber-600" title="Verrouillée">🔒</span>}
            {readOnly && <span className="ml-2 text-slate-500 text-sm">(Lecture seule)</span>}
          </h1>
          <p className="text-slate-600 mt-1">Maquette {maquette.code}</p>
        </div>
        {canWrite && !readOnly && (
          <>
            {canLockUnlock && !filiereLocked && !formationLocked && !semestreLocked ? (
              <button
                onClick={async () => {
                  try {
                    await api(`/formations/maquettes/${maquetteId}/verrouiller`, { method: 'PATCH' });
                    load();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Erreur');
                  }
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium"
              >
                {maquette.verrouille ? '🔓 Déverrouiller' : '🔒 Verrouiller'}
              </button>
            ) : maquette.verrouille && !filiereLocked && !formationLocked && !semestreLocked && (
              <button
                onClick={async () => {
                  const motif = prompt('Motif de la demande (optionnel) :');
                  try {
                    await api(`/formations/maquettes/${maquetteId}/demande-deverrouillage`, {
                      method: 'POST',
                      body: JSON.stringify({ motif: motif || undefined }),
                    });
                    toast.success('Demande envoyée. L\'administrateur sera notifié.');
                    load();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Erreur');
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
              >
                Demander le déverrouillage
              </button>
            )}
            {canEditMaquette && (
            <button
              onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <span>Import par lot (Excel / CSV)</span>
          </button>
            )}
          </>
        )}
      </div>

      <div className="mt-8 space-y-6">
        {(!maquette.ues || maquette.ues.length === 0) ? (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
            <p className="text-slate-700 font-medium mb-2">Maquette vide</p>
            <p className="text-slate-600 text-sm mb-4">Importez un fichier Excel ou CSV (colonnes séparées par <strong>point-virgule</strong>, comme Excel FR) pour remplir la maquette en lot. Ensuite, chaque UE et EC reste modifiable individuellement sur cette page.</p>
            {canEditMaquette && (
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium"
              >
                Import par lot (Excel / CSV)
              </button>
            )}
          </div>
        ) : (
        <div className="overflow-x-auto">
          <div className="flex justify-between items-center bg-[#1e3a5f] text-white px-4 py-2 rounded-t-lg">
            <div className="flex gap-6 text-sm font-medium">
              <span>PROGRAMME: {formation.code}</span>
              <span>PARCOURS: {formation.nom}</span>
              <span>SEMESTRE: {maquette.semestre.numero}</span>
            </div>
          </div>
          <div className="text-center font-semibold py-2 bg-slate-50 border-x border-b text-slate-900">Semestre {maquette.semestre.numero}</div>
          <table className="w-full border-collapse text-sm text-slate-900">
                <thead>
                  <tr className="bg-[#1e3a5f] text-white">
                    <th className="border border-slate-300 p-2 text-left w-12"></th>
                    <th className="border border-slate-300 p-2 text-left">Intitulé</th>
                    <th colSpan={3} className="border border-slate-300 p-2 text-center bg-[#2c5282]">ENSEIGNEMENT</th>
                    <th className="border border-slate-300 p-2 text-center bg-[#2c5282]">ETUDIANT</th>
                    <th colSpan={3} className="border border-slate-300 p-2 text-center bg-[#2c5282]">CHARGE DE TRAVAIL</th>
                  </tr>
                  <tr className="bg-[#1e3a5f] text-white">
                    <th className="border border-slate-300 p-1"></th>
                    <th className="border border-slate-300 p-1"></th>
                    <th className="border border-slate-300 p-1 w-14">CM</th>
                    <th className="border border-slate-300 p-1 w-14">TP</th>
                    <th className="border border-slate-300 p-1 w-14">TD</th>
                    <th className="border border-slate-300 p-1 w-14">TPE</th>
                    <th className="border border-slate-300 p-1 w-14">VHT</th>
                    <th className="border border-slate-300 p-1 w-14">COEF</th>
                    <th className="border border-slate-300 p-1 w-14">CREDITS</th>
                  </tr>
                </thead>
                <tbody>
                  {maquette.ues.map((ue, ueIdx) => {
                    let ueCm = 0, ueTp = 0, ueTd = 0, ueTpe = 0, ueVht = 0, ueCoef = 0, ueCredits = 0;
                    ue.ecs.forEach((ec) => {
                      const vht = ec.vhCm + ec.vhTd + ec.vhTp + ec.vhTpe;
                      ueCm += ec.vhCm; ueTp += ec.vhTp; ueTd += ec.vhTd; ueTpe += ec.vhTpe;
                      ueVht += vht; ueCoef += ec.coefficient; ueCredits += ec.creditsEcts;
                    });
                    return (
                      <React.Fragment key={ue.id}>
                        <tr className="bg-slate-100 font-semibold text-slate-900">
                          <td colSpan={9} className="border border-slate-300 p-2">
                            UE {maquette.semestre.numero}.{ueIdx + 1} : {ue.code} — {ue.nom}
                            {canEditMaquette && (
                              <>
                                <button type="button" onClick={() => handleStartEditUE(ue)} className="ml-2 text-blue-600 text-xs hover:underline">Modifier</button>
                                <button type="button" onClick={() => handleDeleteUE(ue.id)} className="ml-2 text-red-600 text-xs hover:underline">Suppr.</button>
                              </>
                            )}
                          </td>
                        </tr>
                        {canEditMaquette && editingUEId === ue.id && (
                          <tr className="bg-slate-50">
                            <td colSpan={9} className="border border-slate-300 p-2">
                              <form onSubmit={handleUpdateUE} className="flex gap-2 items-center flex-wrap text-sm text-slate-900">
                                <input value={formUEEdit.code} onChange={(e) => setFormUEEdit({ ...formUEEdit, code: e.target.value })} placeholder="Code UE" className="px-2 py-1 border rounded w-20 text-slate-900 bg-white" required autoComplete="off" />
                                <input value={formUEEdit.nom} onChange={(e) => setFormUEEdit({ ...formUEEdit, nom: e.target.value })} placeholder="Nom UE" className="px-2 py-1 border rounded w-48 text-slate-900 bg-white" required autoComplete="off" />
                                <input type="number" value={formUEEdit.coefficient} onChange={(e) => setFormUEEdit({ ...formUEEdit, coefficient: +e.target.value })} placeholder="Coef" className="px-2 py-1 border rounded w-14 text-slate-900 bg-white" />
                                <input type="number" value={formUEEdit.creditsEcts} onChange={(e) => setFormUEEdit({ ...formUEEdit, creditsEcts: +e.target.value })} placeholder="ECTS" className="px-2 py-1 border rounded w-14 text-slate-900 bg-white" />
                                <button type="submit" className="px-3 py-1 bg-green-600 text-white rounded">Enregistrer</button>
                                <button type="button" onClick={() => setEditingUEId(null)} className="px-3 py-1 bg-slate-400 text-white rounded">Annuler</button>
                              </form>
                            </td>
                          </tr>
                        )}
                        {ue.ecs.map((ec, ecIdx) => {
                          const vht = ec.vhCm + ec.vhTd + ec.vhTp + ec.vhTpe;
                          return (
                            <React.Fragment key={ec.id}>
                              <tr className="hover:bg-slate-50 text-slate-900">
                                <td className="border border-slate-300 p-2 text-center text-slate-700">{ueIdx + 1}.{ecIdx + 1}</td>
                                <td className="border border-slate-300 p-2 text-slate-900">
                                  {ec.code} {ec.nom}
                                  {canEditMaquette && (
                                    <>
                                      <button type="button" onClick={() => handleStartEditEC(ec)} className="ml-2 text-blue-600 text-xs hover:underline">Modifier</button>
                                      <button type="button" onClick={() => handleDeleteEC(ec.id)} className="ml-2 text-red-600 text-xs hover:underline">Suppr.</button>
                                    </>
                                  )}
                                </td>
                                <td className="border border-slate-300 p-2 text-center text-slate-900">{ec.vhCm}</td>
                                <td className="border border-slate-300 p-2 text-center text-slate-900">{ec.vhTp}</td>
                                <td className="border border-slate-300 p-2 text-center text-slate-900">{ec.vhTd}</td>
                                <td className="border border-slate-300 p-2 text-center text-slate-900">{ec.vhTpe}</td>
                                <td className="border border-slate-300 p-2 text-center text-slate-900">{vht}</td>
                                <td className="border border-slate-300 p-2 text-center text-slate-900">{ec.coefficient}</td>
                                <td className="border border-slate-300 p-2 text-center text-slate-900">{ec.creditsEcts}</td>
                              </tr>
                              {canEditMaquette && editingECId === ec.id && (
                                <tr className="bg-slate-50">
                                  <td colSpan={9} className="border border-slate-300 p-2">
                                    <form onSubmit={handleUpdateEC} className="flex gap-2 items-center flex-wrap text-sm text-slate-900">
                                      <input value={formECEdit.code} onChange={(e) => setFormECEdit({ ...formECEdit, code: e.target.value })} placeholder="Code EC" className="px-2 py-1 border rounded w-20 text-slate-900 bg-white" required autoComplete="off" />
                                      <input value={formECEdit.nom} onChange={(e) => setFormECEdit({ ...formECEdit, nom: e.target.value })} placeholder="Nom EC" className="px-2 py-1 border rounded w-48 text-slate-900 bg-white" required autoComplete="off" />
                                      <input type="number" value={formECEdit.vhCm} onChange={(e) => setFormECEdit({ ...formECEdit, vhCm: +e.target.value })} placeholder="CM" className="px-2 py-1 border rounded w-14 text-slate-900 bg-white" />
                                      <input type="number" value={formECEdit.vhTd} onChange={(e) => setFormECEdit({ ...formECEdit, vhTd: +e.target.value })} placeholder="TD" className="px-2 py-1 border rounded w-14 text-slate-900 bg-white" />
                                      <input type="number" value={formECEdit.vhTp} onChange={(e) => setFormECEdit({ ...formECEdit, vhTp: +e.target.value })} placeholder="TP" className="px-2 py-1 border rounded w-14 text-slate-900 bg-white" />
                                      <input type="number" value={formECEdit.vhTpe} onChange={(e) => setFormECEdit({ ...formECEdit, vhTpe: +e.target.value })} placeholder="TPE" className="px-2 py-1 border rounded w-14 text-slate-900 bg-white" />
                                      <input type="number" step="0.5" value={formECEdit.coefficient} onChange={(e) => setFormECEdit({ ...formECEdit, coefficient: +e.target.value })} placeholder="Coef" className="px-2 py-1 border rounded w-14 text-slate-900 bg-white" />
                                      <input type="number" value={formECEdit.creditsEcts} onChange={(e) => setFormECEdit({ ...formECEdit, creditsEcts: +e.target.value })} placeholder="ECTS" className="px-2 py-1 border rounded w-14 text-slate-900 bg-white" />
                                      <button type="submit" className="px-3 py-1 bg-green-600 text-white rounded">Enregistrer</button>
                                      <button type="button" onClick={() => setEditingECId(null)} className="px-3 py-1 bg-slate-400 text-white rounded">Annuler</button>
                                    </form>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                        <tr key={`sub-${ue.id}`} className="bg-[#b8d4e8] font-bold text-red-800">
                          <td colSpan={2} className="border border-slate-300 p-2">SOUS TOTAL UE {ueIdx + 1} (EN HEURE)</td>
                          <td className="border border-slate-300 p-2 text-center">{ueCm}</td>
                          <td className="border border-slate-300 p-2 text-center">{ueTp}</td>
                          <td className="border border-slate-300 p-2 text-center">{ueTd}</td>
                          <td className="border border-slate-300 p-2 text-center">{ueTpe}</td>
                          <td className="border border-slate-300 p-2 text-center">{ueVht}</td>
                          <td className="border border-slate-300 p-2 text-center">{ueCoef}</td>
                          <td className="border border-slate-300 p-2 text-center">{ueCredits}</td>
                        </tr>
                        {canEditMaquette && showECForm === ue.id && (
                          <tr key={`form-ec-${ue.id}`} className="bg-slate-50">
                            <td colSpan={9} className="border border-slate-300 p-2">
                              <form onSubmit={(e) => handleCreateEC(e, ue.id)} className="flex gap-2 items-center flex-wrap text-sm text-slate-900">
                                <input value={formEC.code} onChange={(e) => setFormEC({ ...formEC, code: e.target.value })} placeholder="Code EC" className="px-2 py-1 border rounded w-20 text-slate-900 bg-white" required autoComplete="off" />
                                <input value={formEC.nom} onChange={(e) => setFormEC({ ...formEC, nom: e.target.value })} placeholder="Nom EC" className="px-2 py-1 border rounded w-48 text-slate-900 bg-white" required autoComplete="off" />
                                <input type="number" value={formEC.vhCm} onChange={(e) => setFormEC({ ...formEC, vhCm: +e.target.value })} placeholder="CM" className="px-2 py-1 border rounded w-14 text-slate-900 bg-white" />
                                <input type="number" value={formEC.vhTd} onChange={(e) => setFormEC({ ...formEC, vhTd: +e.target.value })} placeholder="TD" className="px-2 py-1 border rounded w-14 text-slate-900 bg-white" />
                                <input type="number" value={formEC.vhTp} onChange={(e) => setFormEC({ ...formEC, vhTp: +e.target.value })} placeholder="TP" className="px-2 py-1 border rounded w-14 text-slate-900 bg-white" />
                                <input type="number" value={formEC.vhTpe} onChange={(e) => setFormEC({ ...formEC, vhTpe: +e.target.value })} placeholder="TPE" className="px-2 py-1 border rounded w-14 text-slate-900 bg-white" />
                                <input type="number" step="0.5" value={formEC.coefficient} onChange={(e) => setFormEC({ ...formEC, coefficient: +e.target.value })} placeholder="Coef" className="px-2 py-1 border rounded w-14 text-slate-900 bg-white" />
                                <input type="number" value={formEC.creditsEcts} onChange={(e) => setFormEC({ ...formEC, creditsEcts: +e.target.value })} placeholder="ECTS" className="px-2 py-1 border rounded w-14 text-slate-900 bg-white" />
                                <button type="submit" className="px-3 py-1 bg-green-600 text-white rounded">Créer</button>
                                <button type="button" onClick={() => setShowECForm(null)} className="px-3 py-1 bg-slate-400 text-white rounded">Annuler</button>
                              </form>
                            </td>
                          </tr>
                        )}
                        {canEditMaquette && showECForm !== ue.id && (
                          <tr key={`add-ec-${ue.id}`}>
                            <td colSpan={9} className="border border-slate-300 p-1">
                              <button onClick={() => setShowECForm(ue.id)} className="text-xs text-blue-600 hover:underline">+ Ajouter EC à cette UE</button>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  <tr className="bg-[#b8d4e8] font-bold text-red-800">
                    <td colSpan={2} className="border border-slate-300 p-2">TOTAL ENSEIGNEMENTS SEMESTRE {maquette.semestre.numero} (EN HEURE)</td>
                    <td className="border border-slate-300 p-2 text-center">{totals.cm}</td>
                    <td className="border border-slate-300 p-2 text-center">{totals.tp}</td>
                    <td className="border border-slate-300 p-2 text-center">{totals.td}</td>
                    <td className="border border-slate-300 p-2 text-center">{totals.tpe}</td>
                    <td className="border border-slate-300 p-2 text-center">{totals.vht}</td>
                    <td className="border border-slate-300 p-2 text-center">{totals.coef}</td>
                    <td className="border border-slate-300 p-2 text-center">{totals.credits}</td>
                  </tr>
                </tbody>
              </table>
              {canEditMaquette && (
                <div className="mt-2 flex gap-4 flex-wrap">
                  {!showUEForm && (
                    <button onClick={() => setShowUEForm(true)} className="text-sm text-blue-600 hover:underline">+ Ajouter UE</button>
                  )}
                  {showUEForm && (
                    <form onSubmit={(e) => handleCreateUE(e)} className="flex gap-2 items-center flex-wrap text-slate-900">
                      <input value={formUE.code} onChange={(e) => setFormUE({ ...formUE, code: e.target.value })} placeholder="Code UE" className="px-2 py-1 border rounded w-20 text-slate-900 bg-white" required autoComplete="off" />
                      <input value={formUE.nom} onChange={(e) => setFormUE({ ...formUE, nom: e.target.value })} placeholder="Nom UE" className="px-2 py-1 border rounded w-48 text-slate-900 bg-white" required autoComplete="off" />
                      <input type="number" value={formUE.coefficient} onChange={(e) => setFormUE({ ...formUE, coefficient: +e.target.value })} placeholder="Coef" className="px-2 py-1 border rounded w-14 text-slate-900 bg-white" />
                      <input type="number" value={formUE.creditsEcts} onChange={(e) => setFormUE({ ...formUE, creditsEcts: +e.target.value })} placeholder="ECTS" className="px-2 py-1 border rounded w-14 text-slate-900 bg-white" />
                      <button type="submit" className="px-3 py-1 bg-green-600 text-white rounded text-sm">Créer</button>
                      <button type="button" onClick={() => setShowUEForm(false)} className="px-3 py-1 bg-slate-400 text-white rounded text-sm">Annuler</button>
                    </form>
                  )}
                </div>
              )}
        </div>
        )}
      </div>

      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">Import maquette par lot (Excel ou CSV)</h2>
              <button onClick={() => { setShowImportModal(false); setImportPreview(null); }} className="text-slate-500 hover:text-slate-700 text-2xl">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex gap-4 flex-wrap mb-4">
                <button type="button" onClick={handleDownloadTemplate} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium">
                  Template Excel (.xlsx)
                </button>
                <button type="button" onClick={handleDownloadTemplateCsv} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium">
                  Template CSV (séparateur ;)
                </button>
                <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium cursor-pointer">
                  Charger Excel ou CSV
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" />
                </label>
              </div>
              <p className="text-slate-600 text-sm mb-4">
                Colonnes : Semestre ; Code UE ; Nom UE ; Coef UE ; ECTS UE ; Code EC ; Nom EC ; CM ; TD ; TP ; TPE ; Coef EC ; ECTS EC.
                Pour le CSV, utilisez le <strong>point-virgule (;)</strong> ou la <strong>tabulation</strong> entre colonnes (comme un export Excel français), pas des virgules entre colonnes.
                Avec le fichier Excel du template, l’en-tête peut se trouver après les lignes de bandeau : la ligne où la première cellule est « Semestre » est détectée automatiquement.
              </p>
              {importLoading && <p className="text-slate-500">Analyse en cours...</p>}
              {importPreview && (
                <div>
                  <p className="font-medium text-slate-700 mb-2">
                    {importPreview.rows.length} ligne(s) — {importPreview.totalErrors > 0 ? (
                      <span className="text-red-600">{importPreview.totalErrors} erreur(s) à corriger</span>
                    ) : (
                      <span className="text-green-600">Prêt à importer</span>
                    )}
                  </p>
                  <div className="overflow-x-auto max-h-64 border rounded">
                    <table className="w-full text-sm text-slate-900">
                      <thead className="bg-slate-100 sticky top-0">
                        <tr>
                          <th className="p-2 text-left">Sem.</th>
                          <th className="p-2 text-left">Code UE</th>
                          <th className="p-2 text-left">Nom UE</th>
                          <th className="p-2 text-left">Code EC</th>
                          <th className="p-2 text-left">Nom EC</th>
                          <th className="p-2 text-center">CM</th>
                          <th className="p-2 text-center">TD</th>
                          <th className="p-2 text-center">TP</th>
                          <th className="p-2 text-center">Coef</th>
                          <th className="p-2 text-center">ECTS</th>
                          <th className="p-2 text-left">Erreurs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.rows.map((r, i) => (
                          <tr key={i} className={r.errors.length ? 'bg-red-50' : ''}>
                            <td className="p-2 text-slate-900">{r.semestreNumero}</td>
                            <td className="p-2 text-slate-900">{r.ueCode}</td>
                            <td className="p-2 text-slate-900">{r.ueNom}</td>
                            <td className="p-2 text-slate-900">{r.ecCode}</td>
                            <td className="p-2 text-slate-900">{r.ecNom}</td>
                            <td className="p-2 text-center text-slate-900">{r.ecVhCm}</td>
                            <td className="p-2 text-center text-slate-900">{r.ecVhTd}</td>
                            <td className="p-2 text-center text-slate-900">{r.ecVhTp}</td>
                            <td className="p-2 text-center text-slate-900">{r.ecCoefficient}</td>
                            <td className="p-2 text-center text-slate-900">{r.ecCreditsEcts}</td>
                            <td className="p-2 text-red-600 text-xs">{r.errors.join(', ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button onClick={() => { setShowImportModal(false); setImportPreview(null); }} className="px-4 py-2 border rounded-lg">Annuler</button>
              <button
                onClick={handleConfirmImport}
                disabled={!importPreview?.canImport || importLoading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg"
              >
                Valider l&apos;import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
