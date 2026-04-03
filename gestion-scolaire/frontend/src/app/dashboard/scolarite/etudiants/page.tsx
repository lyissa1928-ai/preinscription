'use client';

import { useCallback, useEffect, useState, Fragment } from 'react';
import Link from 'next/link';
import { BackLink } from '@/components/ui/back-link';
import { api, getApiUrl, getFetchUrl, downloadFile } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

type Filiere = { id: string; code: string; nom: string };
type Formation = { id: string; code: string; nom: string; filiere?: Filiere };
type Cohort = { id: string; nom: string; section: string; annee: number; formationId: string };
type Inscription = { formation: Formation; cohort?: { id: string; nom: string; section: string; annee: number } };
type Student = {
  photoProfil?: string | null;
  statutInscription: string;
  justificatifBac?: string | null;
  justificatifCni?: string | null;
};
type Person = {
  id: string;
  matricule: string;
  type: string;
  user?: { email: string; firstName: string; lastName: string };
  student?: Student;
  inscriptions?: Inscription[];
};

const STATUT_LABEL: Record<string, string> = {
  valide: 'Inscrit',
  en_attente: 'En attente',
  incomplet: 'Incomplet',
  suspendu: 'Suspendu',
};

const currentYear = new Date().getFullYear();
const YEARS = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2];

function StatutBadge({ statut }: { statut: string }) {
  const label = STATUT_LABEL[statut] ?? statut;
  const cls =
    statut === 'valide'
      ? 'bg-emerald-100 text-emerald-800'
      : statut === 'en_attente'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-slate-100 text-slate-700';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function DocsPastille({ person }: { person: Person }) {
  const s = person.student;
  const ok = !!(s?.photoProfil && s?.justificatifBac && s?.justificatifCni);
  return (
    <span
      className={`inline-flex h-5 w-5 rounded-full flex-shrink-0 ${ok ? 'bg-emerald-500' : 'bg-red-500'}`}
      title={ok ? 'Documents complets' : 'Document(s) manquant(s)'}
    />
  );
}

export default function EtudiantsPage() {
  const toast = useToast();
  const [persons, setPersons] = useState<Person[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filiereId, setFiliereId] = useState('');
  const [formationId, setFormationId] = useState('');
  const [anneeUniv, setAnneeUniv] = useState('');
  const [cohortId, setCohortId] = useState('');
  const [statut, setStatut] = useState('');
  const [groupByFormation, setGroupByFormation] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [openDownloadId, setOpenDownloadId] = useState<string | null>(null);
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [openBulkMenu, setOpenBulkMenu] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [transferCohorts, setTransferCohorts] = useState<Cohort[]>([]);

  const loadStudents = useCallback(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (filiereId) params.set('filiereId', filiereId);
    if (formationId) params.set('formationId', formationId);
    if (cohortId) params.set('cohortId', cohortId);
    if (anneeUniv) params.set('anneeUniv', anneeUniv);
    if (statut) params.set('statut', statut);
    setLoading(true);
    api<Person[]>(`/persons/students?${params.toString()}`)
      .then(setPersons)
      .catch(() => setPersons([]))
      .finally(() => setLoading(false));
  }, [search, filiereId, formationId, cohortId, anneeUniv, statut]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  useEffect(() => {
    api<Filiere[]>('/filieres').then(setFilieres).catch(() => setFilieres([]));
  }, []);

  useEffect(() => {
    const q = filiereId ? `?filiereId=${filiereId}` : '';
    api<Formation[]>(`/formations${q}`).then(setFormations).catch(() => setFormations([]));
  }, [filiereId]);

  useEffect(() => {
    if (!formationId) {
      setCohorts([]);
      setCohortId('');
      return;
    }
    api<Cohort[]>(`/inscriptions/cohorts?formationId=${formationId}`)
      .then(setCohorts)
      .catch(() => setCohorts([]));
    setCohortId('');
  }, [formationId]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size >= persons.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(persons.map((p) => p.id)));
  };

  const handleValider = async (personId: string) => {
    setActionLoading(personId);
    try {
      await api(`/persons/students/${personId}/valider-dossier`, { method: 'PATCH' });
      loadStudents();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownload = (personId: string, type: 'photo' | 'justificatif_bac' | 'justificatif_cni', filename: string) => {
    downloadFile(`/persons/students/${personId}/documents/${type}`, filename).catch((e) =>
      toast.error(e instanceof Error ? e.message : 'Téléchargement impossible'),
    );
  };

  const handleDelete = async (id: string) => {
    setActionLoading(id);
    try {
      await api(`/persons/${id}`, { method: 'DELETE' });
      setDeleteConfirm(null);
      loadStudents();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) {
      toast.error('Aucun étudiant sélectionné.');
      return;
    }
    if (!confirm(`Supprimer ${ids.length} étudiant(s) ?`)) return;
    setBulkLoading(true);
    try {
      const res = await api<{ deleted: number }>('/persons/bulk', {
        method: 'DELETE',
        body: JSON.stringify({ ids }),
      });
      setSelectedIds(new Set());
      setOpenBulkMenu(false);
      loadStudents();
      toast.success(`${res.deleted} étudiant(s) supprimé(s).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkStatus = async (statutInscription: string) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setBulkLoading(true);
    try {
      await api('/persons/students/bulk', { method: 'PATCH', body: JSON.stringify({ personIds: ids, statutInscription }) });
      setSelectedIds(new Set());
      setShowStatusModal(false);
      loadStudents();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkExport = async (format: 'excel' | 'pdf') => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setBulkLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const url = getFetchUrl('/persons/students/export');
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ personIds: ids, format }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `etudiants-export.${format}`;
      a.click();
      URL.revokeObjectURL(blobUrl);
      setOpenBulkMenu(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export impossible');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkTransfer = async (targetCohortId: string) => {
    const ids = Array.from(selectedIds);
    if (!ids.length || !targetCohortId) return;
    setBulkLoading(true);
    try {
      await api('/persons/students/bulk-transfer', {
        method: 'POST',
        body: JSON.stringify({ personIds: ids, cohortId: targetCohortId, anneeUniv: anneeUniv ? +anneeUniv : undefined }),
      });
      setSelectedIds(new Set());
      setShowTransferModal(false);
      loadStudents();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBulkLoading(false);
    }
  };

  const apiBase = getApiUrl();
  const getFormationName = (p: Person) => p.inscriptions?.[0]?.formation?.nom ?? '–';
  const getFiliereName = (p: Person) =>
    p.inscriptions?.[0]?.formation?.filiere?.nom ?? p.inscriptions?.[0]?.formation?.nom ?? '–';
  const getCohortLabel = (p: Person) => {
    const c = p.inscriptions?.[0]?.cohort;
    return c ? `${c.nom} ${c.section || ''}`.trim() : '–';
  };

  const groupedByFormation = groupByFormation
    ? persons.reduce<Record<string, Person[]>>((acc, p) => {
        const key = getFormationName(p);
        if (!acc[key]) acc[key] = [];
        acc[key].push(p);
        return acc;
      }, {})
    : null;

  return (
    <div>
      <BackLink href="/dashboard/scolarite" className="text-sm text-slate-600 hover:text-slate-800 mb-2 inline-block">← Retour scolarité</BackLink>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Liste des étudiants</h1>
          <p className="text-sm text-slate-600 mt-0.5">Les étudiants sont associés à une classe / promotion / cohorte. Import groupé recommandé : <Link href="/dashboard/pedagogie/classes" className="text-blue-600 hover:underline">Pédagogie → Classes</Link> ou <Link href="/dashboard/scolarite/inscriptions" className="text-blue-600 hover:underline">Inscriptions</Link>.</p>
        </div>
        <Link
          href="/dashboard/scolarite/etudiants/nouveau"
          className="px-3 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-800 text-sm inline-flex justify-center shrink-0"
        >
          Nouvelle inscription (individuelle)
        </Link>
      </div>

      {/* Barre de filtres hiérarchiques */}
      <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <input
            type="search"
            placeholder="Nom, matricule"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm w-full col-span-2"
          />
          <select
            value={filiereId}
            onChange={(e) => { setFiliereId(e.target.value); setFormationId(''); setCohortId(''); }}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm w-full"
          >
            <option value="">Toutes filières</option>
            {filieres.map((f) => (
              <option key={f.id} value={f.id}>{f.nom}</option>
            ))}
          </select>
          <select
            value={formationId}
            onChange={(e) => setFormationId(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm w-full"
          >
            <option value="">Toutes formations</option>
            {formations.map((f) => (
              <option key={f.id} value={f.id}>{f.nom}</option>
            ))}
          </select>
          <select
            value={anneeUniv}
            onChange={(e) => setAnneeUniv(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm w-full"
          >
            <option value="">Toutes années</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>Promo {y}</option>
            ))}
          </select>
          <select
            value={cohortId}
            onChange={(e) => setCohortId(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm w-full"
          >
            <option value="">Toutes classes</option>
            {cohorts
              .filter((c) => !anneeUniv || c.annee === +anneeUniv)
              .map((c) => (
                <option key={c.id} value={c.id}>{c.nom} {c.section ? ` ${c.section}` : ''}</option>
              ))}
          </select>
          <select
            value={statut}
            onChange={(e) => setStatut(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm w-full"
          >
            <option value="">Tous statuts</option>
            <option value="valide">Inscrit</option>
            <option value="en_attente">En attente</option>
            <option value="incomplet">Incomplet</option>
            <option value="suspendu">Suspendu</option>
          </select>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={groupByFormation}
              onChange={(e) => setGroupByFormation(e.target.checked)}
              className="rounded border-slate-300"
            />
            Regrouper par formation
          </label>
        </div>
      </div>

      {/* Actions groupées */}
      {selectedIds.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-600">{selectedIds.size} sélectionné(s)</span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenBulkMenu(!openBulkMenu)}
              className="px-3 py-1.5 rounded border border-slate-300 bg-white text-sm hover:bg-slate-50"
            >
              Actions groupées ▾
            </button>
            {openBulkMenu && (
              <>
                <div className="fixed inset-0 z-10" aria-hidden onClick={() => setOpenBulkMenu(false)} />
                <div className="absolute left-0 top-full z-20 mt-1 min-w-[200px] rounded border border-slate-200 bg-white py-1 shadow-lg">
                  <button type="button" onClick={() => { setShowStatusModal(true); setOpenBulkMenu(false); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50">
                    Changer le statut
                  </button>
                  <button type="button" onClick={() => handleBulkExport('excel')} disabled={bulkLoading} className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50">
                    Exporter en Excel
                  </button>
                  <button type="button" onClick={() => handleBulkExport('pdf')} disabled={bulkLoading} className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50">
                    Exporter en PDF
                  </button>
                  <button type="button" onClick={() => { setShowTransferModal(true); setOpenBulkMenu(false); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50">
                    Transférer vers une classe
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    disabled={bulkLoading}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600"
                  >
                    Supprimer les étudiants sélectionnés
                  </button>
                </div>
              </>
            )}
          </div>
          <button type="button" onClick={() => setSelectedIds(new Set())} className="text-sm text-slate-500 hover:text-slate-700">Tout désélectionner</button>
        </div>
      )}

      {/* Modals */}
      {showStatusModal && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg p-4 shadow-xl max-w-sm w-full mx-2">
            <h3 className="font-semibold text-slate-800 mb-3">Changer le statut</h3>
            <div className="flex flex-wrap gap-2">
              {(['valide', 'en_attente', 'suspendu'] as const).map((s) => (
                <button key={s} onClick={() => handleBulkStatus(s)} disabled={bulkLoading} className="px-3 py-1.5 rounded border border-slate-300 text-sm hover:bg-slate-50">
                  {STATUT_LABEL[s]}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setShowStatusModal(false)} className="mt-3 text-sm text-slate-500 hover:text-slate-700">Annuler</button>
          </div>
        </div>
      )}

      {showTransferModal && (
        <TransferModal
          formations={formations}
          transferCohorts={transferCohorts}
          setTransferCohorts={setTransferCohorts}
          onTransfer={handleBulkTransfer}
          onClose={() => setShowTransferModal(false)}
          bulkLoading={bulkLoading}
        />
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow">
        {loading ? (
          <div className="p-6 text-center text-slate-500 text-sm">Chargement...</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="p-2 w-8">
                  <input type="checkbox" checked={persons.length > 0 && selectedIds.size === persons.length} onChange={toggleSelectAll} className="rounded border-slate-300" />
                </th>
                <th className="p-2 font-medium text-slate-700 w-10">Docs</th>
                <th className="p-2 font-medium text-slate-700">Photo</th>
                <th className="p-2 font-medium text-slate-700">Nom</th>
                <th className="p-2 font-medium text-slate-700">Matricule</th>
                <th className="p-2 font-medium text-slate-700">Formation</th>
                <th className="p-2 font-medium text-slate-700">Classe</th>
                <th className="p-2 font-medium text-slate-700">Statut</th>
                <th className="p-2 font-medium text-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {persons.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-4 text-center text-slate-500 text-sm">Aucun étudiant trouvé.</td>
                </tr>
              ) : groupedByFormation ? (
                Object.entries(groupedByFormation).map(([formationName, list]) => (
                  <Fragment key={formationName}>
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <td colSpan={9} className="p-2 font-medium text-slate-700">
                        {formationName} : {list.length} étudiant{list.length > 1 ? 's' : ''}
                      </td>
                    </tr>
                    {list.map((p) => (
                      <Row
                        key={p.id}
                        p={p}
                        apiBase={apiBase}
                        getCohortLabel={getCohortLabel}
                        selected={selectedIds.has(p.id)}
                        onToggleSelect={toggleSelect}
                        onValider={handleValider}
                        onDownload={handleDownload}
                        onDelete={handleDelete}
                        deleteConfirm={deleteConfirm}
                        setDeleteConfirm={setDeleteConfirm}
                        actionLoading={actionLoading}
                        openDownloadId={openDownloadId}
                        setOpenDownloadId={setOpenDownloadId}
                        openActionId={openActionId}
                        setOpenActionId={setOpenActionId}
                      />
                    ))}
                  </Fragment>
                ))
              ) : (
                persons.map((p) => (
                  <Row
                    key={p.id}
                    p={p}
                    apiBase={apiBase}
                    getCohortLabel={getCohortLabel}
                    selected={selectedIds.has(p.id)}
                    onToggleSelect={toggleSelect}
                    onValider={handleValider}
                    onDownload={handleDownload}
                    onDelete={handleDelete}
                    deleteConfirm={deleteConfirm}
                    setDeleteConfirm={setDeleteConfirm}
                    actionLoading={actionLoading}
                    openDownloadId={openDownloadId}
                    setOpenDownloadId={setOpenDownloadId}
                    openActionId={openActionId}
                    setOpenActionId={setOpenActionId}
                  />
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function TransferModal({
  formations,
  transferCohorts,
  setTransferCohorts,
  onTransfer,
  onClose,
  bulkLoading,
}: {
  formations: Formation[];
  transferCohorts: Cohort[];
  setTransferCohorts: (c: Cohort[]) => void;
  onTransfer: (cohortId: string) => void;
  onClose: () => void;
  bulkLoading: boolean;
}) {
  const [formationId, setFormationId] = useState('');
  const [cohortId, setCohortId] = useState('');
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg p-4 shadow-xl max-w-sm w-full mx-2">
        <h3 className="font-semibold text-slate-800 mb-3">Transférer vers une classe</h3>
        <p className="text-sm text-slate-600 mb-2">Choisir la formation puis la classe cible.</p>
        <select
          className="mb-2 w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
          value={formationId}
          onChange={(e) => {
            const fid = e.target.value;
            setFormationId(fid);
            setCohortId('');
            if (fid) api<Cohort[]>(`/inscriptions/cohorts?formationId=${fid}`).then(setTransferCohorts).catch(() => setTransferCohorts([]));
            else setTransferCohorts([]);
          }}
        >
          <option value="">Formation</option>
          {formations.map((f) => (
            <option key={f.id} value={f.id}>{f.nom}</option>
          ))}
        </select>
        <select
          className="mb-3 w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
          value={cohortId}
          onChange={(e) => setCohortId(e.target.value)}
        >
          <option value="">Classe</option>
          {transferCohorts.map((c) => (
            <option key={c.id} value={c.id}>{c.nom} {c.section ? ` ${c.section}` : ''}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => cohortId && onTransfer(cohortId)}
            disabled={bulkLoading || !cohortId}
            className="px-3 py-1.5 bg-slate-700 text-white rounded text-sm hover:bg-slate-800 disabled:opacity-50"
          >
            Transférer
          </button>
          <button type="button" onClick={onClose} className="px-3 py-1.5 border border-slate-300 rounded text-sm hover:bg-slate-50">Annuler</button>
        </div>
      </div>
    </div>
  );
}

function Row({
  p,
  apiBase,
  getCohortLabel,
  selected,
  onToggleSelect,
  onValider,
  onDownload,
  onDelete,
  deleteConfirm,
  setDeleteConfirm,
  actionLoading,
  openDownloadId,
  setOpenDownloadId,
  openActionId,
  setOpenActionId,
}: {
  p: Person;
  apiBase: string;
  getCohortLabel: (p: Person) => string;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onValider: (id: string) => void;
  onDownload: (id: string, type: 'photo' | 'justificatif_bac' | 'justificatif_cni', name: string) => void;
  onDelete: (id: string) => void;
  deleteConfirm: string | null;
  setDeleteConfirm: (id: string | null) => void;
  actionLoading: string | null;
  openDownloadId: string | null;
  setOpenDownloadId: (id: string | null) => void;
  openActionId: string | null;
  setOpenActionId: (id: string | null) => void;
}) {
  const hasDocs = !!(p.student?.photoProfil && p.student?.justificatifBac && p.student?.justificatifCni);
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="p-2">
        <input type="checkbox" checked={selected} onChange={() => onToggleSelect(p.id)} className="rounded border-slate-300" />
      </td>
      <td className="p-2">
        <DocsPastille person={p} />
      </td>
      <td className="p-2">
        {p.student?.photoProfil ? (
          <span className="inline-block h-8 w-8 rounded-full overflow-hidden bg-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${apiBase}${p.student.photoProfil}`} alt="" className="h-full w-full object-cover" />
          </span>
        ) : (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-500 text-xs font-medium">
            {(p.user?.firstName?.[0] ?? p.user?.lastName?.[0] ?? '?')}
          </span>
        )}
      </td>
      <td className="p-2">
        <Link href={`/dashboard/scolarite/etudiants/${p.id}`} className="font-medium text-slate-800 hover:text-slate-600">
          {p.user ? `${p.user.firstName} ${p.user.lastName}` : '–'}
        </Link>
      </td>
      <td className="p-2 font-mono text-slate-700 text-xs">{p.matricule}</td>
      <td className="p-2 text-slate-600 text-xs">{p.inscriptions?.[0]?.formation?.nom ?? '–'}</td>
      <td className="p-2 text-slate-600 text-xs">{getCohortLabel(p)}</td>
      <td className="p-2">
        <StatutBadge statut={p.student?.statutInscription ?? 'en_attente'} />
      </td>
      <td className="p-2 text-right">
        {deleteConfirm === p.id ? (
          <div className="flex flex-wrap gap-1 justify-end">
            <button onClick={() => onDelete(p.id)} disabled={actionLoading === p.id} className="px-2 py-1 text-xs bg-red-600 text-white rounded">Oui</button>
            <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 text-xs border rounded">Non</button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1 justify-end items-center">
            <Link href={`/dashboard/scolarite/etudiants/${p.id}`} className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 hover:bg-slate-100 text-slate-600" title="Voir"><span className="sr-only">Voir</span><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></Link>
            {p.student?.statutInscription !== 'valide' && (
              <button onClick={() => onValider(p.id)} disabled={actionLoading === p.id} className="inline-flex h-7 w-7 items-center justify-center rounded border border-emerald-500 text-emerald-600 hover:bg-emerald-50" title="Valider dossier"><span className="sr-only">Valider</span><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
            )}
            <div className="relative inline-block">
              <button type="button" onClick={() => setOpenDownloadId(openDownloadId === p.id ? null : p.id)} className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 hover:bg-slate-100 text-slate-600" title="Documents"><span className="sr-only">Docs</span><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></button>
              {openDownloadId === p.id && (
                <>
                  <div className="fixed inset-0 z-10" aria-hidden onClick={() => setOpenDownloadId(null)} />
                  <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded border border-slate-200 bg-white py-1 shadow-lg text-xs">
                    {p.student?.photoProfil && <button type="button" onClick={() => { onDownload(p.id, 'photo', 'photo.jpg'); setOpenDownloadId(null); }} className="block w-full px-2 py-1.5 text-left hover:bg-slate-50">Photo</button>}
                    {p.student?.justificatifBac && <button type="button" onClick={() => { onDownload(p.id, 'justificatif_bac', 'bac.pdf'); setOpenDownloadId(null); }} className="block w-full px-2 py-1.5 text-left hover:bg-slate-50">Diplôme Bac</button>}
                    {p.student?.justificatifCni && <button type="button" onClick={() => { onDownload(p.id, 'justificatif_cni', 'cni.pdf'); setOpenDownloadId(null); }} className="block w-full px-2 py-1.5 text-left hover:bg-slate-50">CNI</button>}
                    {!hasDocs && <span className="block px-2 py-1.5 text-slate-500">Aucun document</span>}
                  </div>
                </>
              )}
            </div>
            <div className="relative inline-block">
              <button type="button" onClick={() => setOpenActionId(openActionId === p.id ? null : p.id)} className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 hover:bg-slate-100 text-slate-600" title="Plus"><span className="sr-only">Plus</span><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1  0 110-2 1 1 0 010 2z" /></svg></button>
              {openActionId === p.id && (
                <>
                  <div className="fixed inset-0 z-10" aria-hidden onClick={() => setOpenActionId(null)} />
                  <div className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded border border-slate-200 bg-white py-1 shadow-lg text-xs">
                    <Link href={`/dashboard/scolarite/etudiants/${p.id}/edit`} className="block px-2 py-1.5 text-left hover:bg-slate-50">Éditer</Link>
                    <button type="button" onClick={() => { downloadFile(`/persons/students/${p.id}/attestation`, 'attestation-scolarite.pdf'); setOpenActionId(null); }} className="block w-full px-2 py-1.5 text-left hover:bg-slate-50">Attestation de scolarité</button>
                    <button type="button" onClick={() => { downloadFile(`/persons/students/${p.id}/carte`, 'carte-etudiant.pdf'); setOpenActionId(null); }} className="block w-full px-2 py-1.5 text-left hover:bg-slate-50">Carte étudiant</button>
                    <button type="button" onClick={() => { setDeleteConfirm(p.id); setOpenActionId(null); }} className="block w-full px-2 py-1.5 text-left hover:bg-slate-50 text-red-600">Supprimer</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </td>
    </tr>
  );
}
