'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { BackLink } from '@/components/ui/back-link';
import { FormSectionCard } from '@/components/ui/form-section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormGroup } from '@/components/ui/form-group';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { api, apiUpload, getApiUrl } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { canWriteTeacherProfile } from '@/config/rbac';
import { JOURS_EDT } from '@/lib/edt-constants';

function useUserRole(): string | null {
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    try {
      const u = localStorage.getItem('user');
      setRole(u ? (JSON.parse(u) as { role?: string }).role ?? null : null);
    } catch {
      setRole(null);
    }
  }, []);
  return role;
}

type Person = {
  id: string;
  matricule: string;
  type: string;
  dateNaissance?: string;
  user?: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    address?: string;
    profilePhotoUrl?: string | null;
  };
  teacher?: {
    id: string;
    typeContrat: string;
    niveauEtude?: string;
    articlesPublies?: number;
    rangGrade?: string;
    dateDebut?: string;
    dateFin?: string;
  };
};

type Course = {
  id: string;
  jour: number;
  heureDebut: number;
  heureFin: number;
  type: string;
  ec?: { code: string; nom: string };
  salle?: { nom: string };
};

export default function FicheEnseignantPage() {
  const params = useParams();
  const id = params.id as string;
  const toast = useToast();
  const userRole = useUserRole();
  const canAccessEmploiDuTemps = userRole !== 'SCOLARITE';
  const canEditProfile = canWriteTeacherProfile(userRole);
  const [person, setPerson] = useState<Person | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    typeContrat: 'VACATAIRE',
    niveauEtude: '',
    articlesPublies: '' as number | '',
    rangGrade: '',
  });

  useEffect(() => {
    if (!id) return;
    api<Person>(`/persons/${id}`)
      .then((p) => {
        setPerson(p);
        if (p.teacher) {
          setForm({
            typeContrat: p.teacher.typeContrat,
            niveauEtude: p.teacher.niveauEtude ?? '',
            articlesPublies: p.teacher.articlesPublies ?? '',
            rangGrade: p.teacher.rangGrade ?? '',
          });
          return api<Course[]>(`/courses?teacherId=${p.teacher.id}`).catch(() => []);
        }
        return [];
      })
      .then((c) => setCourses(Array.isArray(c) ? c : []))
      .catch(() => setPerson(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!person?.teacher) return;
    try {
      await api(`/persons/teachers/${person.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          typeContrat: form.typeContrat,
          niveauEtude: form.niveauEtude || undefined,
          articlesPublies: form.articlesPublies === '' ? undefined : Number(form.articlesPublies),
          rangGrade: form.rangGrade || undefined,
        }),
      });
      setPerson((prev) =>
        prev && prev.teacher
          ? {
              ...prev,
              teacher: {
                ...prev.teacher,
                typeContrat: form.typeContrat,
                niveauEtude: form.niveauEtude || undefined,
                articlesPublies:
                  form.articlesPublies === '' ? undefined : Number(form.articlesPublies),
                rangGrade: form.rangGrade || undefined,
              },
            }
          : prev,
      );
      setEditing(false);
      toast.success('Profil enregistré.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !person?.user) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiUpload<{ profilePhotoUrl: string }>(`/persons/teachers/${person.id}/photo`, fd);
      setPerson((prev) =>
        prev?.user
          ? { ...prev, user: { ...prev.user, profilePhotoUrl: res.profilePhotoUrl } }
          : prev,
      );
      toast.success('Photo enregistrée (badge PDF et profil).');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec du téléversement.');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl">
        <BackLink
          href="/dashboard/scolarite/enseignants"
          className="mb-2 inline-block text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
        >
          ← Retour à la liste
        </BackLink>
        <p className="py-12 text-center text-sm text-[var(--foreground-muted)]">
          Chargement...
        </p>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="max-w-4xl">
        <BackLink
          href="/dashboard/scolarite/enseignants"
          className="mb-2 inline-block text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
        >
          ← Retour à la liste
        </BackLink>
        <p className="text-[var(--foreground-muted)]">Enseignant non trouvé.</p>
        <Link
          href="/dashboard/scolarite/enseignants"
          className="mt-2 inline-block text-sm text-[var(--color-primary)] hover:underline"
        >
          Retour à la liste
        </Link>
      </div>
    );
  }

  const fullName = person.user
    ? `${person.user.firstName} ${person.user.lastName}`
    : person.matricule;

  const apiBase = getApiUrl();
  const photoUrl = person.user?.profilePhotoUrl;

  return (
    <div className="max-w-4xl space-y-6">
      <BackLink
        href="/dashboard/scolarite/enseignants"
        className="mb-2 inline-block text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
      >
        ← Retour à la liste
      </BackLink>
      <PageHeader
        title={fullName}
        description={`Matricule : ${person.matricule}${person.user?.email ? ` • ${person.user.email}` : ''}`}
      />
      {person.user?.phone && (
        <p className="text-sm text-[var(--foreground-muted)]">Tél. : {person.user.phone}</p>
      )}
      {person.user?.address && (
        <p className="text-sm text-[var(--foreground-muted)]">Adresse : {person.user.address}</p>
      )}

      {person.user && (
        <FormSectionCard
          title="Photo de profil"
          description="Utilisée sur le badge PDF et le compte utilisateur. Formats : JPEG ou PNG (max. 2 Mo)."
        >
          <div className="flex flex-wrap items-center gap-4">
            <div className="h-24 w-24 rounded-full border-2 border-[var(--border)] bg-[var(--surface-muted)] overflow-hidden flex items-center justify-center shrink-0">
              {photoUrl ? (
                <img
                  src={`${apiBase}${photoUrl}`}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-2xl text-[var(--foreground-muted)]">
                  {person.user.firstName?.[0]}
                  {person.user.lastName?.[0]}
                </span>
              )}
            </div>
            {canEditProfile ? (
              <div className="space-y-2">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={uploadingPhoto}
                  onClick={() => photoInputRef.current?.click()}
                >
                  {uploadingPhoto ? 'Envoi…' : 'Choisir une photo'}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-[var(--foreground-muted)]">
                Seuls la scolarité, le service pédagogique ou un administrateur peuvent modifier la photo.
              </p>
            )}
          </div>
        </FormSectionCard>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <FormSectionCard
          title="Profil enseignant"
          description="Type de contrat, grade et publications. Le prix horaire dépend de l'EC (voir Tarifs)."
        >
          {person.teacher ? (
            editing && canEditProfile ? (
              <div className="space-y-4">
                <FormGroup label="Type de contrat">
                  <Select
                    value={form.typeContrat}
                    onChange={(e) => setForm((p) => ({ ...p, typeContrat: e.target.value }))}
                  >
                    <option value="VACATAIRE">Vacataire</option>
                    <option value="PERMANENT">Permanent</option>
                  </Select>
                </FormGroup>
                <FormGroup label="Niveau d'étude">
                  <Input
                    value={form.niveauEtude}
                    onChange={(e) => setForm((p) => ({ ...p, niveauEtude: e.target.value }))}
                    placeholder="Doctorat, Master..."
                  />
                </FormGroup>
                <FormGroup label="Rang / Grade">
                  <Input
                    value={form.rangGrade}
                    onChange={(e) => setForm((p) => ({ ...p, rangGrade: e.target.value }))}
                    placeholder="MCF, PR..."
                  />
                </FormGroup>
                <FormGroup label="Articles publiés">
                  <Input
                    type="number"
                    min={0}
                    value={form.articlesPublies === '' ? '' : form.articlesPublies}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        articlesPublies: e.target.value === '' ? '' : +e.target.value,
                      }))
                    }
                  />
                </FormGroup>
                <div className="flex gap-2">
                  <Button type="button" variant="primary" onClick={handleSave}>
                    Enregistrer
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-[var(--foreground)]">
                  <span className="font-medium">Type de contrat :</span>{' '}
                  {person.teacher.typeContrat}
                </p>
                {person.teacher.niveauEtude && (
                  <p className="text-sm text-[var(--foreground)]">
                    <span className="font-medium">Niveau d'étude :</span>{' '}
                    {person.teacher.niveauEtude}
                  </p>
                )}
                {person.teacher.rangGrade && (
                  <p className="text-sm text-[var(--foreground)]">
                    <span className="font-medium">Rang / Grade :</span> {person.teacher.rangGrade}
                  </p>
                )}
                {person.teacher.articlesPublies != null && (
                  <p className="text-sm text-[var(--foreground)]">
                    <span className="font-medium">Articles publiés :</span>{' '}
                    {person.teacher.articlesPublies}
                  </p>
                )}
                {canEditProfile ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-3"
                    onClick={() => setEditing(true)}
                  >
                    Modifier
                  </Button>
                ) : (
                  <p className="mt-3 text-xs text-[var(--foreground-muted)]">
                    Modification du contrat / grade : service pédagogique, responsable pédagogique ou administrateur.
                  </p>
                )}
              </div>
            )
          ) : (
            <p className="text-sm text-[var(--foreground-muted)]">Aucune fiche enseignant</p>
          )}
        </FormSectionCard>

        <SectionCard
          title={`Emploi du temps (${courses.length} cours)`}
          actionLabel={canAccessEmploiDuTemps ? "Voir l'EDT complet" : undefined}
          actionHref={canAccessEmploiDuTemps ? '/dashboard/pedagogie/emploi-du-temps' : undefined}
        >
          {courses.length === 0 ? (
            <p className="text-sm text-[var(--foreground-muted)]">Aucun cours assigné</p>
          ) : (
            <ul className="space-y-2 text-sm text-[var(--foreground)]">
              {courses.slice(0, 5).map((c) => (
                <li key={c.id}>
                  {JOURS_EDT[c.jour] ?? `J${c.jour}`} {c.heureDebut}h–{c.heureFin}h — {c.ec?.code ?? c.type} —{' '}
                  {c.salle?.nom ?? '-'}
                </li>
              ))}
              {courses.length > 5 && (
                <li>
                  {canAccessEmploiDuTemps ? (
                    <Link
                      href={`/dashboard/pedagogie/emploi-du-temps?teacherId=${person.teacher?.id}`}
                      className="text-[var(--color-primary)] hover:underline"
                    >
                      + {courses.length - 5} autres cours
                    </Link>
                  ) : (
                    <span className="text-[var(--foreground-muted)]">
                      + {courses.length - 5} autres cours
                    </span>
                  )}
                </li>
              )}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
