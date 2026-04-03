'use client';

import { useEffect, useMemo, useState } from 'react';
import { BackLink } from '@/components/ui/back-link';
import { api, downloadFile } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { JOURS_EDT, JOUR_INDICES_EDT, heuresGrilleEdt, heuresOptionsEdt } from '@/lib/edt-constants';

function parseCsvCourses(text: string): Array<{ ecCode: string; teacherMatricule: string; salleCode: string; jour: number; heureDebut: number; heureFin: number; type: string; groupe?: string; anneeUniv: number }> {
  const lines = text.trim().replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(';').map((h) => h.trim().toLowerCase());
  const idx = (name: string) => headers.indexOf(name);
  const get = (row: string[], key: string) => (row[idx(key)] ?? '').trim();
  return lines.slice(1).map((line) => {
    const row = line.split(';').map((c) => c.trim());
    return {
      ecCode: get(row, 'eccode'),
      teacherMatricule: get(row, 'teachermatricule'),
      salleCode: get(row, 'sallecode'),
      jour: parseInt(get(row, 'jour'), 10) || 1,
      heureDebut: parseInt(get(row, 'heuredebut'), 10) || 8,
      heureFin: parseInt(get(row, 'heurefin'), 10) || 10,
      type: get(row, 'type') || 'CM',
      groupe: get(row, 'groupe') || undefined,
      anneeUniv: parseInt(get(row, 'anneeuniv'), 10) || new Date().getFullYear(),
    };
  }).filter((r) => r.ecCode && r.teacherMatricule && r.salleCode);
}
type EC = { id: string; code: string; nom: string };
type UE = { id: string; code: string; ecs: EC[] };
type Maquette = { id: string; ues: UE[] };
type Semestre = { id: string; numero: number; maquettes: Maquette[] };
type Formation = { id: string; code: string; semestres: Semestre[] };
type Person = { id: string; matricule: string; user?: { firstName: string; lastName: string }; teacher?: { id: string } };
type Campus = { id: string; code: string; nom: string; regionNom?: string | null; departementNom?: string | null };
type Salle = { id: string; nom: string; campus: Campus | null };
type Cohort = { id: string; nom: string; section: string; annee: number; formation?: { code: string }; campus?: { nom: string } | null };

type Course = {
  id: string;
  jour: number;
  heureDebut: number;
  heureFin: number;
  type: string;
  groupe?: string | null;
  /** Année universitaire du créneau (si renvoyée par l’API). */
  anneeUniv?: number;
  pointageActif?: boolean;
  ec: { code: string; nom: string; ue: { maquette: { semestre: { numero: number } } } };
  teacher: { person: Person };
  salle: Salle;
  cohort?: Cohort | null;
};

/** Réponse GET/PATCH /courses/:id (champs nécessaires pour préremplir le formulaire d’édition) */
type CourseDetail = Course & {
  ecId: string;
  teacherId: string;
  salleId: string;
  ec: Course['ec'] & {
    ue: { maquette: { semestre: { formation?: { id: string } } } };
  };
  salle: Salle & { campus: Campus | null };
};

type TeacherPerson = Person & { teacher?: { id: string } };

export default function EmploiDuTempsPage() {
  const toast = useToast();
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [ecs, setEcs] = useState<EC[]>([]);
  const [teachers, setTeachers] = useState<TeacherPerson[]>([]);
  const [salles, setSalles] = useState<Salle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [campusId, setCampusId] = useState('');
  /** Campus choisi pour la création d'un cours (obligatoire) ; détermine les salles proposées */
  const [formCampusId, setFormCampusId] = useState('');
  const [formSalles, setFormSalles] = useState<Salle[]>([]);
  const [matriculeFilter, setMatriculeFilter] = useState('');
  const [formationId, setFormationId] = useState('');
  const [semestreId, setSemestreId] = useState('');
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [form, setForm] = useState({
    ecId: '',
    teacherId: '',
    salleId: '',
    cohortId: '',
    jour: 1,
    heureDebut: 8,
    heureFin: 10,
    type: 'CM',
    groupe: '',
    anneeUniv: new Date().getFullYear(),
  });
  const [conflicts, setConflicts] = useState<string[]>([]);
  /** Cours en cours d’édition (conflits calculés en excluant cet id, comme au PATCH) */
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [importCsv, setImportCsv] = useState('');
  const [importResult, setImportResult] = useState<{ created: number; errors: string[] } | null>(null);

  useEffect(() => {
    let coursesUrl = campusId
      ? `/courses?anneeUniv=${form.anneeUniv}&campusId=${campusId}`
      : `/courses?anneeUniv=${form.anneeUniv}`;
    const sallesUrl = campusId ? `/salles?campusId=${campusId}` : '/salles';
    Promise.all([
      api<Campus[]>('/campuses').catch(() => []),
      api<Formation[]>('/formations'),
      api<TeacherPerson[]>('/persons?type=TEACHER'),
      api<Salle[]>(sallesUrl),
    ])
      .then(([camp, f, t, s]) => {
        setCampuses(Array.isArray(camp) ? camp : []);
        setFormations(f);
        setTeachers(Array.isArray(t) ? t.filter((x) => x.teacher) : []);
        setSalles(Array.isArray(s) ? s : []);
        if (matriculeFilter.trim()) {
          const teacher = (Array.isArray(t) ? t : []).find((p) => p.matricule === matriculeFilter.trim());
          if (teacher?.teacher?.id) coursesUrl += `&teacherId=${teacher.teacher.id}`;
        }
        return api<Course[]>(coursesUrl);
      })
      .then(setCourses)
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, [form.anneeUniv, campusId, matriculeFilter]);

  useEffect(() => {
    if (!formationId) return;
    api<Formation>(`/formations/${formationId}`)
      .then((f) => {
        const allEcs: EC[] = [];
        f.semestres?.forEach((s) =>
          s.maquettes?.forEach((m) =>
            m.ues?.forEach((ue) => ue.ecs?.forEach((ec) => allEcs.push(ec)))
          )
        );
        setEcs(allEcs);
      })
      .catch(() => setEcs([]));
  }, [formationId]);

  /** Charger les salles du campus choisi pour le formulaire de création */
  useEffect(() => {
    if (!formCampusId) {
      setFormSalles([]);
      setCohorts([]);
      setForm((f) => (f.salleId ? { ...f, salleId: '', cohortId: '' } : { ...f, cohortId: '' }));
      return;
    }
    api<Salle[]>(`/salles?campusId=${formCampusId}`)
      .then((list) => setFormSalles(Array.isArray(list) ? list : []))
      .catch(() => setFormSalles([]));
    setForm((f) => (f.salleId ? { ...f, salleId: '' } : f));
  }, [formCampusId]);

  useEffect(() => {
    if (!formCampusId || !formationId) {
      setCohorts([]);
      return;
    }
    const y = form.anneeUniv;
    api<Cohort[]>(`/inscriptions/cohorts?campusId=${formCampusId}&formationId=${formationId}&annee=${y}`)
      .then((list) => setCohorts(Array.isArray(list) ? list : []))
      .catch(() => setCohorts([]));
  }, [formCampusId, formationId, form.anneeUniv]);

  useEffect(() => {
    if (!form.teacherId || !form.salleId || !form.jour) return;
    const g = encodeURIComponent(form.groupe || '');
    let url = `/courses/check-conflicts?salleId=${form.salleId}&teacherId=${form.teacherId}&jour=${form.jour}&heureDebut=${form.heureDebut}&heureFin=${form.heureFin}&anneeUniv=${form.anneeUniv}&groupe=${g}`;
    if (editingCourseId) url += `&excludeCourseId=${encodeURIComponent(editingCourseId)}`;
    api<string[]>(url)
      .then(setConflicts)
      .catch(() => setConflicts([]));
  }, [form.teacherId, form.salleId, form.jour, form.heureDebut, form.heureFin, form.groupe, form.anneeUniv, editingCourseId]);

  const openEditCourse = async (courseId: string) => {
    setEditLoading(true);
    try {
      const full = await api<CourseDetail>(`/courses/${courseId}`);
      setEditingCourseId(courseId);
      setShowForm(true);
      const campusFromSalle = full.salle?.campus?.id ?? '';
      setFormCampusId(campusFromSalle || campusId);
      const fid = full.ec?.ue?.maquette?.semestre?.formation?.id ?? '';
      setFormationId(fid);
      setForm({
        ecId: full.ecId,
        teacherId: full.teacherId,
        salleId: full.salleId,
        cohortId: '',
        jour: full.jour,
        heureDebut: full.heureDebut,
        heureFin: full.heureFin,
        type: full.type,
        groupe: full.groupe ?? '',
        anneeUniv: full.anneeUniv ?? new Date().getFullYear(),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossible de charger le cours');
    } finally {
      setEditLoading(false);
    }
  };

  const handleSubmitCourseForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCampusId) {
      toast.error('Veuillez sélectionner un campus.');
      return;
    }
    if (conflicts.length > 0) {
      toast.error('Conflits détectés : ' + conflicts.join(', '));
      return;
    }
    // Ne pas envoyer cohortId vide : le backend le transformerait en null et détacherait la cohorte.
    const body: Record<string, unknown> = {
      ecId: form.ecId,
      teacherId: form.teacherId,
      salleId: form.salleId,
      jour: form.jour,
      heureDebut: form.heureDebut,
      heureFin: form.heureFin,
      type: form.type,
      anneeUniv: form.anneeUniv,
    };
    if (form.groupe?.trim()) body.groupe = form.groupe.trim();
    if (form.cohortId?.trim()) body.cohortId = form.cohortId.trim();
    try {
      if (editingCourseId) {
        const updated = await api<Course>(`/courses/${editingCourseId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        setCourses((prev) => prev.map((c) => (c.id === editingCourseId ? { ...c, ...updated } : c)));
        setShowForm(false);
        setEditingCourseId(null);
        toast.success('Cours mis à jour.');
      } else {
        const created = await api<Course>('/courses', { method: 'POST', body: JSON.stringify(body) });
        setCourses((prev) => [...prev, created]);
        setShowForm(false);
        toast.success('Cours créé.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce cours ?')) return;
    try {
      await api(`/courses/${id}`, { method: 'DELETE' });
      setCourses((prev) => prev.filter((c) => c.id !== id));
      setSelectedCourseIds((s) => { const n = new Set(s); n.delete(id); return n; });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleDownloadTemplate = () => {
    downloadFile('/courses/template', 'template-emploi-du-temps.xlsx').catch((e) => toast.error(e?.message || 'Erreur'));
  };

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = parseCsvCourses(importCsv);
    if (items.length === 0) {
      toast.error('Aucune ligne valide (ecCode;teacherMatricule;salleCode;jour;heureDebut;heureFin;type;groupe;anneeUniv)');
      return;
    }
    try {
      const res = await api<{ created: number; errors: string[] }>('/courses/bulk', { method: 'POST', body: JSON.stringify({ items }) });
      setImportResult(res);
      setImportCsv('');
      if (res.created > 0) {
        const coursesUrl = campusId ? `/courses?anneeUniv=${form.anneeUniv}&campusId=${campusId}` : `/courses?anneeUniv=${form.anneeUniv}`;
        api<Course[]>(coursesUrl).then(setCourses).catch(() => {});
      }
      toast.success(`${res.created} cours créé(s).${res.errors?.length ? ` ${res.errors.length} erreur(s).` : ''}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedCourseIds);
    if (ids.length === 0) { toast.error('Aucun cours sélectionné.'); return; }
    if (!confirm(`Supprimer ${ids.length} cours ?`)) return;
    try {
      await api('/courses/bulk', { method: 'DELETE', body: JSON.stringify({ ids }) });
      setCourses((prev) => prev.filter((c) => !ids.includes(c.id)));
      setSelectedCourseIds(new Set());
      toast.success(`${ids.length} cours supprimé(s).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const toggleCourseSelect = (id: string) => {
    setSelectedCourseIds((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const getCourseAt = (jour: number, heure: number) =>
    courses.find((c) => c.jour === jour && c.heureDebut <= heure && c.heureFin > heure);

  const exportTeacherId = useMemo(() => {
    if (!matriculeFilter.trim()) return '';
    const p = teachers.find((x) => x.matricule === matriculeFilter.trim());
    return p?.teacher?.id ?? '';
  }, [matriculeFilter, teachers]);

  const exportFilenameBase = useMemo(() => {
    const c = campuses.find((x) => x.id === campusId);
    const code = c?.code?.replace(/[^a-zA-Z0-9-_]/g, '_') || 'campus';
    return `EDT_${code}_${form.anneeUniv}`;
  }, [campuses, campusId, form.anneeUniv]);

  const handleExportPdf = () => {
    if (!campusId) {
      toast.error('Sélectionnez d’abord un campus : chaque site a son propre emploi du temps.');
      return;
    }
    let q = `campusId=${encodeURIComponent(campusId)}&anneeUniv=${form.anneeUniv}`;
    if (exportTeacherId) q += `&teacherId=${encodeURIComponent(exportTeacherId)}`;
    downloadFile(`/courses/export/campus-pdf?${q}`, `${exportFilenameBase}.pdf`).catch((e) =>
      toast.error(e?.message || 'Échec du téléchargement PDF'),
    );
  };

  const handleExportDocx = () => {
    if (!campusId) {
      toast.error('Sélectionnez d’abord un campus : chaque site a son propre emploi du temps.');
      return;
    }
    let q = `campusId=${encodeURIComponent(campusId)}&anneeUniv=${form.anneeUniv}`;
    if (exportTeacherId) q += `&teacherId=${encodeURIComponent(exportTeacherId)}`;
    downloadFile(`/courses/export/campus-docx?${q}`, `${exportFilenameBase}.docx`).catch((e) =>
      toast.error(e?.message || 'Échec du téléchargement Word'),
    );
  };

  if (loading) return <p className="text-slate-500">Chargement...</p>;

  return (
    <div>
      <div className="flex justify-between items-center">
        <div>
          <BackLink href="/dashboard/scolarite" className="text-sm text-slate-600 hover:text-slate-800 mb-2 inline-block">← Retour scolarité</BackLink>
          <h1 className="text-2xl font-bold text-slate-800">Emploi du temps</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={campusId}
            onChange={(e) => setCampusId(e.target.value)}
            className="px-3 py-2 border rounded"
            title="Chaque campus gère son propre emploi du temps"
          >
            <option value="">Tous les campus</option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>{c.code} – {c.nom}{c.departementNom ? ` (${c.departementNom})` : c.regionNom ? ` (${c.regionNom})` : ''}</option>
            ))}
          </select>
          <select
            value={matriculeFilter}
            onChange={(e) => setMatriculeFilter(e.target.value)}
            className="px-3 py-2 border rounded"
            title="Filtrer par matricule enseignant (un enseignant ne peut pas être sur deux campus au même créneau)"
          >
            <option value="">Tous les enseignants</option>
            {teachers.map((p) => (
              <option key={p.id} value={p.matricule}>{p.matricule} – {p.user?.lastName} {p.user?.firstName}</option>
            ))}
          </select>
          <select
            value={form.anneeUniv}
            onChange={(e) => setForm({ ...form, anneeUniv: +e.target.value })}
            className="px-3 py-2 border rounded"
          >
            {[2023, 2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button type="button" onClick={handleDownloadTemplate} className="px-3 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 text-sm">
            Modèle CSV
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={!campusId}
            title={!campusId ? 'Choisissez un campus pour exporter' : 'Document officiel (logo, établissement, responsable pédagogique, année)'}
            className="px-3 py-2 bg-rose-700 text-white rounded hover:bg-rose-800 text-sm disabled:opacity-45 disabled:cursor-not-allowed"
          >
            Télécharger PDF
          </button>
          <button
            type="button"
            onClick={handleExportDocx}
            disabled={!campusId}
            title={!campusId ? 'Choisissez un campus pour exporter' : 'Même contenu que le PDF, format Word'}
            className="px-3 py-2 bg-indigo-700 text-white rounded hover:bg-indigo-800 text-sm disabled:opacity-45 disabled:cursor-not-allowed"
          >
            Télécharger Word
          </button>
          {selectedCourseIds.size > 0 && (
            <button type="button" onClick={handleBulkDelete} className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
              Supprimer ({selectedCourseIds.size})
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (showForm) {
                setShowForm(false);
                setEditingCourseId(null);
              } else {
                setEditingCourseId(null);
                setShowForm(true);
                setForm({
                  ecId: '',
                  teacherId: '',
                  salleId: '',
                  cohortId: '',
                  jour: 1,
                  heureDebut: 8,
                  heureFin: 10,
                  type: 'CM',
                  groupe: '',
                  anneeUniv: form.anneeUniv,
                });
                setFormationId('');
                setFormCampusId((prev) => prev || campusId);
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {showForm ? 'Annuler' : '+ Ajouter cours'}
          </button>
        </div>
      </div>

      <div className="mt-4 p-4 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-950">
        <p className="font-semibold text-amber-900">Un emploi du temps par campus</p>
        <p className="mt-1">
          Sélectionnez le <strong>campus</strong> concerné, puis ajoutez ou importez les cours. Pour créer un cours, le formulaire exige aussi un campus
          (salles du site). Les exports officiels incluent le <strong>nom de l’établissement</strong> et le <strong>logo</strong> (paramètres
          d’apparence), l’<strong>année universitaire</strong>, le <strong>responsable pédagogique</strong> rattaché au campus, l’adresse du site et la
          grille complète (filtrée par enseignant si vous utilisez le filtre matricule).
        </p>
        {!campusId && (
          <p className="mt-2 font-medium text-amber-900">
            → Choisissez un campus dans la liste ci-dessus pour activer <strong>Télécharger PDF</strong> et <strong>Télécharger Word</strong>.
          </p>
        )}
      </div>

      <section className="mt-4 p-4 bg-white rounded-lg shadow border">
        <h3 className="font-medium text-slate-800 mb-2">Ajouter par lot (CSV)</h3>
        <p className="text-sm text-slate-600 mb-2">ecCode;teacherMatricule;salleCode;jour;heureDebut;heureFin;type;groupe;anneeUniv</p>
        <form onSubmit={handleImportCsv}>
          <textarea value={importCsv} onChange={(e) => setImportCsv(e.target.value)} className="w-full px-3 py-2 border rounded font-mono text-sm" rows={4} placeholder="ecCode;teacherMatricule;salleCode;jour;heureDebut;heureFin;type;groupe;anneeUniv" />
          <button type="submit" className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Importer</button>
        </form>
        {importResult && <p className="mt-2 text-sm">{importResult.created} créé(s). {importResult.errors?.length ? importResult.errors.length + ' erreur(s).' : ''}</p>}
      </section>

      {showForm && (
        <form onSubmit={handleSubmitCourseForm} className="mt-6 p-4 bg-white rounded-lg shadow border">
          <h3 className="font-medium mb-4">{editingCourseId ? 'Modifier le cours' : 'Nouveau cours'}</h3>
          <p className="text-sm text-slate-600 mb-4">
            Le campus détermine les salles disponibles. Jours : lundi à samedi. Créneaux : 8h à 23h (heures entières).
            <span className="block mt-1">
              <strong>Salle :</strong> plusieurs cours peuvent utiliser la même salle le même jour si les horaires ne se
              chevauchent pas (ex. 8h–10h puis 10h–12h). Un conflit n&apos;apparaît que si deux cours se superposent dans le temps.
            </span>
            {editingCourseId && (
              <span className="block mt-1 text-slate-700">
                Vous pouvez changer l’horaire, la salle, l’EC, etc. Les conflits sont vérifiés en ignorant ce cours jusqu’à
                enregistrement.
              </span>
            )}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Campus <span className="text-red-600">*</span></label>
              <select
                value={formCampusId}
                onChange={(e) => setFormCampusId(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                required
              >
                <option value="">-- Choisir un campus --</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} – {c.nom}{c.departementNom ? ` (${c.departementNom})` : c.regionNom ? ` (${c.regionNom})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Formation (pour filtrer EC)</label>
              <select
                value={formationId}
                onChange={(e) => setFormationId(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">-- Sélectionner --</option>
                {formations.map((f) => (
                  <option key={f.id} value={f.id}>{f.code}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">EC</label>
              <select
                value={form.ecId}
                onChange={(e) => setForm({ ...form, ecId: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              >
                <option value="">-- Sélectionner --</option>
                {ecs.map((e) => (
                  <option key={e.id} value={e.id}>{e.code} - {e.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Enseignant</label>
              <select
                value={form.teacherId}
                onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              >
                <option value="">-- Sélectionner --</option>
                {teachers.filter((t) => t.teacher).map((t) => (
                  <option key={t.id} value={t.teacher!.id}>
                    {t.user ? `${t.user.firstName} ${t.user.lastName}` : t.matricule}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Salle <span className="text-red-600">*</span></label>
              <select
                value={form.salleId}
                onChange={(e) => setForm({ ...form, salleId: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
                disabled={!formCampusId}
              >
                <option value="">
                  {formCampusId ? '-- Choisir une salle du campus --' : '-- Sélectionnez d\'abord un campus --'}
                </option>
                {formSalles.map((s) => (
                  <option key={s.id} value={s.id}>{s.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Jour</label>
              <select
                value={form.jour}
                onChange={(e) => setForm({ ...form, jour: +e.target.value })}
                className="w-full px-3 py-2 border rounded"
              >
                {JOUR_INDICES_EDT.map((j) => (
                  <option key={j} value={j}>{JOURS_EDT[j]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Heure début - fin</label>
              <div className="flex gap-2">
                <select
                  value={form.heureDebut}
                  onChange={(e) => {
                    const hd = +e.target.value;
                    setForm((f) => ({
                      ...f,
                      heureDebut: hd,
                      heureFin: f.heureFin <= hd ? Math.min(23, hd + 1) : f.heureFin,
                    }));
                  }}
                  className="flex-1 px-3 py-2 border rounded"
                >
                  {heuresOptionsEdt()
                    .filter((h) => h < 23)
                    .map((h) => (
                      <option key={h} value={h}>{h}h</option>
                    ))}
                </select>
                <select
                  value={form.heureFin}
                  onChange={(e) => setForm({ ...form, heureFin: +e.target.value })}
                  className="flex-1 px-3 py-2 border rounded"
                >
                  {heuresOptionsEdt()
                    .filter((h) => h > form.heureDebut)
                    .map((h) => (
                      <option key={h} value={h}>{h}h</option>
                    ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="CM">CM</option>
                <option value="TD">TD</option>
                <option value="TP">TP</option>
                <option value="TPE">TPE</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Groupe (optionnel)</label>
              <input
                type="text"
                value={form.groupe}
                onChange={(e) => setForm({ ...form, groupe: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="TD1, Groupe A..."
              />
            </div>
          </div>
          {conflicts.length > 0 && (
            <div className="mt-2 p-2 bg-red-50 text-red-700 text-sm rounded">
              Conflits : {conflicts.join(', ')}
            </div>
          )}
          <button
            type="submit"
            disabled={editLoading}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {editingCourseId ? 'Enregistrer les modifications' : 'Créer'}
          </button>
        </form>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full bg-white rounded-lg shadow border text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 w-24 text-left">Heure</th>
              {JOUR_INDICES_EDT.map((j) => (
                <th key={j} className="p-2 min-w-[120px] text-left">{JOURS_EDT[j]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heuresGrilleEdt().map((h) => (
              <tr key={h} className="border-b">
                <td className="p-2 font-medium">{h}h</td>
                {JOUR_INDICES_EDT.map((j) => {
                  const c = getCourseAt(j, h);
                  if (!c) return <td key={j} className="p-2 bg-slate-50"></td>;
                  if (c.heureDebut !== h) return <td key={j} className="p-2"></td>;
                  const span = c.heureFin - c.heureDebut;
                  return (
                    <td key={j} rowSpan={span} className="p-2 align-top border-l">
                      <div className="bg-blue-50 rounded p-2 text-xs">
                        <label className="flex items-center gap-1 mb-1">
                          <input type="checkbox" checked={selectedCourseIds.has(c.id)} onChange={() => toggleCourseSelect(c.id)} onClick={(e) => e.stopPropagation()} />
                          <span className="font-medium">{c.ec.code} {c.type}</span>
                        </label>
                        <div>{c.ec.nom}</div>
                        <div>{c.salle.nom}{c.salle.campus ? ` (${c.salle.campus.nom})` : ''}</div>
                        <div>
                          {c.teacher.person?.user
                            ? `${c.teacher.person.user.firstName} ${c.teacher.person.user.lastName}`
                            : c.teacher.person?.matricule}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={(ev) => {
                              ev.preventDefault();
                              ev.stopPropagation();
                              openEditCourse(c.id);
                            }}
                            className="text-blue-600 hover:underline"
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              handleDelete(c.id);
                            }}
                            className="text-red-600 hover:underline"
                          >
                            Suppr.
                          </button>
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
