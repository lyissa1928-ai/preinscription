'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, apiUpload } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { QRCodeSVG } from 'qrcode.react';
import { NATIONALITIES } from '@/data/nationalities';
import { JOB_TITLES } from '@/data/jobTitles';
import { SERVICES } from '@/data/services';
import { TeacherBadgeCard } from '@/components/badges/TeacherBadgeCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type User = {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  maritalStatus?: string | null;
  numberOfChildren?: number | null;
  matricule?: string | null;
  phone?: string | null;
  address?: string | null;
  gender?: string | null;
  nationality?: string | null;
  service?: string | null;
  jobTitle?: string | null;
  contractType?: string | null;
  hireDate?: string | null;
  accountStatus?: string | null;
  profilePhotoUrl?: string | null;
  profileValidated?: boolean;
  badgeBarcode?: string | null;
  badgeActive?: boolean;
  badgeQrVersion?: number;
  createdAt: string;
  updatedAt?: string;
};

type BadgePerson = {
  type: string;
  matricule: string;
  dateNaissance?: string | null;
  teacher?: { typeContrat: string } | null;
};

type BadgeData = User & {
  qrPayload: string;
  presenceQrContent: string;
  annéeUniv: string;
  appName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  websiteUrl: string | null;
  person?: BadgePerson | null;
};

/** Rôles autorisés : personnel administratif et technique uniquement. Directeur fédérateur (SERVICE_PEDAGOGIQUE) exclu de ce module. */
const STAFF_ROLES: { value: string; label: string }[] = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'RESPONSABLE_PEDAGOGIQUE', label: 'Responsable pédagogique (campus, voit tout)' },
  { value: 'AGENT_PEDAGOGIQUE', label: 'Agent pédagogique (campus, génère l’EDT)' },
  { value: 'SCOLARITE', label: 'Scolarité' },
  { value: 'DEPT_HEAD', label: 'Chef de département' },
  { value: 'AUDITOR', label: 'Auditeur' },
  { value: 'CAISSIER', label: 'Caissier' },
  { value: 'CHEF_COMPTABLE', label: 'Chef comptable' },
  { value: 'DAF', label: 'DAF' },
];

const MARITAL_OPTIONS = [
  { value: '', label: '—' },
  { value: 'CELIBATAIRE', label: 'Célibataire' },
  { value: 'MARIE', label: 'Marié(e)' },
  { value: 'DIVORCE', label: 'Divorcé(e)' },
  { value: 'VEUF', label: 'Veuf(ve)' },
  { value: 'PACS', label: 'PACS' },
];

const emptyForm = () => ({
  email: '',
  password: '',
  role: 'SCOLARITE',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  maritalStatus: '',
  numberOfChildren: '' as '' | number,
  phone: '',
  address: '',
  gender: '',
  nationality: '',
  service: '',
  jobTitle: '',
  contractType: '',
  hireDate: '',
  accountStatus: 'ACTIF',
});

export default function UtilisateursPage() {
  const router = useRouter();
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [badgeUserId, setBadgeUserId] = useState<string | null>(null);
  const [badgeData, setBadgeData] = useState<BadgeData | null>(null);
  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [identityUser, setIdentityUser] = useState<User | null>(null);
  const [identityForm, setIdentityForm] = useState(emptyForm());
  const [identitySaving, setIdentitySaving] = useState(false);
  const [identityPhotoFile, setIdentityPhotoFile] = useState<File | null>(null);
  const [badgeActionLoading, setBadgeActionLoading] = useState(false);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      const { role } = JSON.parse(u);
      if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        router.replace('/dashboard/admin');
        return;
      }
      setAllowed(true);
    }
  }, [router]);

  const loadUsers = () => {
    api<User[]>('/users')
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!allowed) return;
    loadUsers();
  }, [allowed]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setPhotoFile(null);
    setFormOpen(true);
  };

  const openEdit = (u: User) => {
    setEditingId(u.id);
    setForm({
      email: u.email,
      password: '',
      role: u.role,
      firstName: u.firstName,
      lastName: u.lastName,
      dateOfBirth: u.dateOfBirth ? u.dateOfBirth.slice(0, 10) : '',
      maritalStatus: u.maritalStatus || '',
      numberOfChildren: u.numberOfChildren ?? '',
      phone: u.phone || '',
      address: u.address || '',
      gender: u.gender || '',
      nationality: u.nationality || '',
      service: u.service || '',
      jobTitle: u.jobTitle || '',
      contractType: u.contractType || '',
      hireDate: u.hireDate ? u.hireDate.slice(0, 10) : '',
      accountStatus: u.accountStatus || 'ACTIF',
    });
    setPhotoFile(null);
    setFormOpen(true);
  };

  const submitForm = async () => {
    if (!form.email.trim() || !form.firstName.trim() || !form.lastName.trim()) {
      toast.error('Email, prénom et nom sont requis.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        email: form.email.trim(),
        role: form.role,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dateOfBirth: form.dateOfBirth || undefined,
        maritalStatus: form.maritalStatus || undefined,
        numberOfChildren: form.numberOfChildren === '' ? undefined : Number(form.numberOfChildren),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        gender: form.gender || undefined,
        nationality: form.nationality || undefined,
        service: form.service || undefined,
        jobTitle: form.jobTitle || undefined,
        contractType: form.contractType || undefined,
        hireDate: form.hireDate || undefined,
        accountStatus: form.accountStatus || undefined,
      };
      let createdOrUpdatedId: string;
      if (editingId) {
        await api(`/users/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(form.password.trim() ? { ...payload, password: form.password } : payload),
        });
        createdOrUpdatedId = editingId;
      } else {
        const created = await api<User>('/users', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        createdOrUpdatedId = created.id;
        setFormOpen(false);
        setIdentityUser(created);
        toast.success(`Compte créé. Matricule attribué : ${created.matricule ?? '—'}. Complétez l'identité ci-dessous.`);
      }
      if (photoFile && createdOrUpdatedId) {
        const fd = new FormData();
        fd.append('file', photoFile);
        await apiUpload<{ profilePhotoUrl: string }>(`/users/${createdOrUpdatedId}/photo`, fd);
      }
      if (editingId) setFormOpen(false);
      loadUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const validateProfile = async (id: string) => {
    try {
      await api(`/users/${id}/validate-profile`, { method: 'PATCH' });
      loadUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const openBadge = async (id: string) => {
    try {
      const data = await api<BadgeData>(`/users/${id}/badge-data`);
      setBadgeData(data);
      setBadgeUserId(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Profil non validé ou badge non généré.');
    }
  };

  const setBadgeActiveRemote = async (active: boolean) => {
    if (!badgeUserId) return;
    setBadgeActionLoading(true);
    try {
      await api(`/users/${badgeUserId}/badge-active`, {
        method: 'PATCH',
        body: JSON.stringify({ active }),
      });
      toast.success(active ? 'Badge activé.' : 'Badge désactivé.');
      await openBadge(badgeUserId);
      loadUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action impossible.');
    } finally {
      setBadgeActionLoading(false);
    }
  };

  const regenerateBadgeQrRemote = async () => {
    if (!badgeUserId) return;
    setBadgeActionLoading(true);
    try {
      await api(`/users/${badgeUserId}/regenerate-badge-qr`, { method: 'POST' });
      toast.success('Nouvelle version de QR enregistrée. Réimprimer le badge si besoin.');
      await openBadge(badgeUserId);
      loadUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Régénération impossible.');
    } finally {
      setBadgeActionLoading(false);
    }
  };

  useEffect(() => {
    const barcode = badgeData?.badgeBarcode;
    if (!barcode || !barcodeCanvasRef.current) return;
    import('jsbarcode').then((JsBarcode) => {
      JsBarcode.default(barcodeCanvasRef.current!, barcode, {
        format: 'CODE128',
        width: 1.5,
        height: 40,
        displayValue: true,
      });
    }).catch(() => {});
  }, [badgeData?.badgeBarcode ?? '']);

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev.filter((x) => x !== id), id] : prev.filter((x) => x !== id),
    );
  };

  const toggleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelectedIds([]);
      return;
    }
    const ids = users.filter((u) => u.role !== 'ADMIN' && u.role !== 'SUPER_ADMIN').map((u) => u.id);
    setSelectedIds(ids);
  };

  const deleteOne = async (id: string) => {
    if (!window.confirm('Supprimer définitivement cet utilisateur ?')) return;
    try {
      await api(`/users/${id}`, { method: 'DELETE' });
      toast.success('Utilisateur supprimé.');
      loadUsers();
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors de la suppression.');
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Supprimer définitivement ${selectedIds.length} utilisateur(s) sélectionné(s) ?`)) {
      return;
    }
    try {
      await api('/users/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: selectedIds }),
      });
      toast.success('Utilisateurs supprimés.');
      setSelectedIds([]);
      loadUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Impossible de supprimer certains utilisateurs (admins protégés ?).');
    }
  };

  const openIdentity = (u: User) => {
    setIdentityUser(u);
    setIdentityForm({
      email: u.email,
      password: '',
      role: u.role,
      firstName: u.firstName,
      lastName: u.lastName,
      dateOfBirth: u.dateOfBirth ? u.dateOfBirth.slice(0, 10) : '',
      maritalStatus: u.maritalStatus || '',
      numberOfChildren: u.numberOfChildren ?? '',
      phone: u.phone || '',
      address: u.address || '',
      gender: u.gender || '',
      nationality: u.nationality || '',
      service: u.service || '',
      jobTitle: u.jobTitle || '',
      contractType: u.contractType || '',
      hireDate: u.hireDate ? u.hireDate.slice(0, 10) : '',
      accountStatus: u.accountStatus || 'ACTIF',
    });
    setIdentityPhotoFile(null);
  };

  const saveIdentity = async () => {
    if (!identityUser) return;
    setIdentitySaving(true);
    try {
      const payload = {
        firstName: identityForm.firstName.trim(),
        lastName: identityForm.lastName.trim(),
        dateOfBirth: identityForm.dateOfBirth || undefined,
        maritalStatus: identityForm.maritalStatus || undefined,
        numberOfChildren: identityForm.numberOfChildren === '' ? undefined : Number(identityForm.numberOfChildren),
        phone: identityForm.phone.trim() || undefined,
        address: identityForm.address.trim() || undefined,
        gender: identityForm.gender || undefined,
        nationality: identityForm.nationality || undefined,
        service: identityForm.service || undefined,
        jobTitle: identityForm.jobTitle || undefined,
        contractType: identityForm.contractType || undefined,
        hireDate: identityForm.hireDate || undefined,
        accountStatus: identityForm.accountStatus || undefined,
      };
      await api(`/users/${identityUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      if (identityPhotoFile) {
        const fd = new FormData();
        fd.append('file', identityPhotoFile);
        await apiUpload<{ profilePhotoUrl: string }>(`/users/${identityUser.id}/photo`, fd);
      }
      toast.success('Identité enregistrée.');
      setIdentityUser(null);
      loadUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setIdentitySaving(false);
    }
  };

  if (allowed === null || (allowed && loading)) return <p className="text-slate-500">Chargement...</p>;

  return (
    <div>
      <Link href="/dashboard/admin" className="text-sm text-slate-600 hover:text-slate-800 mb-2 inline-block">
        ← Retour
      </Link>
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Personnel administratif et technique</h1>
          <p className="mt-2 text-slate-600 text-sm">Comptes des agents de la plateforme (scolarité, comptabilité, admin, etc.). Les étudiants et enseignants ne se créent pas ici.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          + Ajouter un utilisateur
        </button>
      </div>

      <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700">
        <p className="font-medium text-slate-800 mb-2">Organisation des comptes</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Étudiants</strong> : ajout par <strong>import de listes</strong> (classe, promotion, cohorte) — <Link href="/dashboard/scolarite/etudiants" className="text-blue-600 hover:underline">Scolarité → Étudiants</Link> ou inscriptions / classes.</li>
          <li>
            <strong>Enseignants</strong> : création par le <strong>service pédagogique</strong>, le{' '}
            <strong>responsable pédagogique</strong> ou un <strong>admin</strong> —{' '}
            <Link href="/dashboard/pedagogie/enseignants" className="text-blue-600 hover:underline">
              Pédagogie → Enseignants
            </Link>{' '}
            (la scolarité peut consulter la liste).
          </li>
          <li><strong>Personnel (admin, scolarité, comptable, etc.)</strong> : créés sur cette page.</li>
        </ul>
      </div>

      {formOpen && (
        <div className="mt-6 p-6 bg-white rounded-lg shadow border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">{editingId ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur (personnel uniquement)'}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            {editingId && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nouveau mot de passe (optionnel)</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rôle *</label>
              <select
                value={form.role}
                onChange={(e) => {
                  const newRole = e.target.value;
                  setForm((f) => {
                    const next = { ...f, role: newRole };
                    if (newRole === 'RESPONSABLE_PEDAGOGIQUE' && f.jobTitle === 'Directeur pédagogique') next.jobTitle = '';
                    return next;
                  });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              >
                {STAFF_ROLES.filter((r) => !(form.jobTitle === 'Directeur pédagogique' && r.value === 'RESPONSABLE_PEDAGOGIQUE')).map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Étudiants : Scolarité → Étudiants. Enseignants : Pédagogie → Enseignants (création hors scolarité).
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prénom *</label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nom *</label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date de naissance</label>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Situation matrimoniale</label>
              <select
                value={form.maritalStatus}
                onChange={(e) => setForm((f) => ({ ...f, maritalStatus: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              >
                {MARITAL_OPTIONS.map((o) => (
                  <option key={o.value || 'x'} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre d&apos;enfants</label>
              <input
                type="number"
                min={0}
                value={form.numberOfChildren === '' ? '' : form.numberOfChildren}
                onChange={(e) => setForm((f) => ({ ...f, numberOfChildren: e.target.value === '' ? '' : Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Adresse</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Genre</label>
              <select
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              >
                <option value="">—</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
                <option value="AUTRE">Autre</option>
                <option value="NON_PRECISE">Non précisé</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nationalité</label>
              <select
                value={form.nationality}
                onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              >
                <option value="">—</option>
                {NATIONALITIES.map((n) => (
                  <option key={n.value} value={n.value}>{n.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Service</label>
              <select
                value={form.service}
                onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              >
                <option value="">—</option>
                {SERVICES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Intitulé de poste</label>
              <select
                value={form.jobTitle}
                onChange={(e) => {
                  const newJobTitle = e.target.value;
                  setForm((f) => {
                    const next = { ...f, jobTitle: newJobTitle };
                    if (newJobTitle === 'Directeur pédagogique' && f.role === 'RESPONSABLE_PEDAGOGIQUE') next.role = 'AGENT_PEDAGOGIQUE';
                    return next;
                  });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              >
                <option value="">—</option>
                {JOB_TITLES.filter((j) => !(form.role === 'RESPONSABLE_PEDAGOGIQUE' && j === 'Directeur pédagogique')).map((j) => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">Responsable pédagogique et Directeur pédagogique ne peuvent pas être choisis ensemble.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type de contrat</label>
              <select
                value={form.contractType}
                onChange={(e) => setForm((f) => ({ ...f, contractType: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              >
                <option value="">—</option>
                <option value="CDI">CDI</option>
                <option value="CDD">CDD</option>
                <option value="VACATAIRE">Vacataire</option>
                <option value="STAGIAIRE">Stagiaire</option>
                <option value="PRESTATAIRE">Prestataire</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date d&apos;embauche</label>
              <input
                type="date"
                value={form.hireDate}
                onChange={(e) => setForm((f) => ({ ...f, hireDate: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Statut du compte</label>
              <select
                value={form.accountStatus}
                onChange={(e) => setForm((f) => ({ ...f, accountStatus: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              >
                <option value="ACTIF">Actif</option>
                <option value="SUSPENDU">Suspendu</option>
                <option value="ARCHIVE">Archivé</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Photo de profil</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submitForm}
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Enregistrement...' : editingId ? 'Enregistrer' : 'Créer'}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="px-4 py-2 bg-slate-200 text-slate-800 rounded hover:bg-slate-300"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {identityUser && (
        <div className="mt-6 p-6 bg-white rounded-lg shadow border border-slate-200 border-l-4 border-l-blue-600">
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Identité — {identityUser.firstName} {identityUser.lastName}</h2>
          <p className="text-sm text-slate-600 mb-4">Complétez les informations du compte. Le matricule est attribué automatiquement par le système.</p>
          <div className="mb-4 p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-sm font-medium text-slate-700">Matricule : </span>
            <span className="text-lg font-mono font-bold text-slate-900">{identityUser.matricule ?? '—'}</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prénom</label>
              <input
                type="text"
                value={identityForm.firstName}
                onChange={(e) => setIdentityForm((f) => ({ ...f, firstName: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
              <input
                type="text"
                value={identityForm.lastName}
                onChange={(e) => setIdentityForm((f) => ({ ...f, lastName: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date de naissance</label>
              <input
                type="date"
                value={identityForm.dateOfBirth}
                onChange={(e) => setIdentityForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Situation matrimoniale</label>
              <select
                value={identityForm.maritalStatus}
                onChange={(e) => setIdentityForm((f) => ({ ...f, maritalStatus: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              >
                {MARITAL_OPTIONS.map((o) => (
                  <option key={o.value || 'x'} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre d&apos;enfants</label>
              <input
                type="number"
                min={0}
                value={identityForm.numberOfChildren === '' ? '' : identityForm.numberOfChildren}
                onChange={(e) => setIdentityForm((f) => ({ ...f, numberOfChildren: e.target.value === '' ? '' : Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
              <input
                type="text"
                value={identityForm.phone}
                onChange={(e) => setIdentityForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Adresse</label>
              <input
                type="text"
                value={identityForm.address}
                onChange={(e) => setIdentityForm((f) => ({ ...f, address: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Genre</label>
              <select
                value={identityForm.gender}
                onChange={(e) => setIdentityForm((f) => ({ ...f, gender: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              >
                <option value="">—</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
                <option value="AUTRE">Autre</option>
                <option value="NON_PRECISE">Non précisé</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nationalité</label>
              <select
                value={identityForm.nationality}
                onChange={(e) => setIdentityForm((f) => ({ ...f, nationality: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              >
                <option value="">—</option>
                {NATIONALITIES.map((n) => (
                  <option key={n.value} value={n.value}>{n.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Service</label>
              <select
                value={identityForm.service}
                onChange={(e) => setIdentityForm((f) => ({ ...f, service: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              >
                <option value="">—</option>
                {SERVICES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Intitulé de poste</label>
              <select
                value={identityForm.jobTitle}
                onChange={(e) => setIdentityForm((f) => ({ ...f, jobTitle: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              >
                <option value="">—</option>
                {JOB_TITLES.filter((j) => !(identityUser?.role === 'RESPONSABLE_PEDAGOGIQUE' && j === 'Directeur pédagogique')).map((j) => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type de contrat</label>
              <select
                value={identityForm.contractType}
                onChange={(e) => setIdentityForm((f) => ({ ...f, contractType: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              >
                <option value="">—</option>
                <option value="CDI">CDI</option>
                <option value="CDD">CDD</option>
                <option value="VACATAIRE">Vacataire</option>
                <option value="STAGIAIRE">Stagiaire</option>
                <option value="PRESTATAIRE">Prestataire</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date d&apos;embauche</label>
              <input
                type="date"
                value={identityForm.hireDate}
                onChange={(e) => setIdentityForm((f) => ({ ...f, hireDate: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Statut du compte</label>
              <select
                value={identityForm.accountStatus}
                onChange={(e) => setIdentityForm((f) => ({ ...f, accountStatus: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              >
                <option value="ACTIF">Actif</option>
                <option value="SUSPENDU">Suspendu</option>
                <option value="ARCHIVE">Archivé</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Photo de profil</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setIdentityPhotoFile(e.target.files?.[0] ?? null)}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={saveIdentity}
              disabled={identitySaving}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {identitySaving ? 'Enregistrement…' : 'Enregistrer l\'identité'}
            </button>
            <button
              type="button"
              onClick={() => setIdentityUser(null)}
              className="px-4 py-2 bg-slate-200 text-slate-800 rounded hover:bg-slate-300"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 overflow-x-auto">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm text-slate-600">
            Sélectionnez plusieurs lignes pour supprimer en lot. Les comptes <strong>ADMIN / SUPER_ADMIN</strong> ne peuvent pas être supprimés.
          </p>
          <button
            type="button"
            onClick={deleteSelected}
            disabled={selectedIds.length === 0}
            className="px-3 py-1.5 rounded bg-red-600 text-white text-sm font-medium disabled:opacity-40"
          >
            Supprimer la sélection
          </button>
        </div>
        <table className="w-full bg-white rounded-lg shadow border">
          <thead>
            <tr className="border-b">
              <th className="p-3 w-10">
                <input
                  type="checkbox"
                  aria-label="Tout sélectionner"
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                  checked={
                    users.length > 0 &&
                    users.filter((u) => u.role !== 'ADMIN' && u.role !== 'SUPER_ADMIN').every((u) =>
                      selectedIds.includes(u.id),
                    )
                  }
                />
              </th>
              <th className="text-left p-3">Identité</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Matricule</th>
              <th className="text-left p-3">Tél</th>
              <th className="text-left p-3">Rôle</th>
              <th className="text-left p-3">Badge</th>
              <th className="text-left p-3">Créé le</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={9} className="p-4 text-slate-500">Aucun utilisateur</td></tr>
            ) : (
              users.map((u) => {
                const isAdmin = u.role === 'ADMIN' || u.role === 'SUPER_ADMIN';
                const isSelected = selectedIds.includes(u.id);
                return (
                  <tr key={u.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 w-10">
                      {!isAdmin && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleSelect(u.id, e.target.checked)}
                          aria-label={`Sélectionner ${u.firstName} ${u.lastName}`}
                        />
                      )}
                    </td>
                  <td className="p-3">{u.firstName} {u.lastName}</td>
                  <td className="p-3 text-sm">{u.email}</td>
                  <td className="p-3 text-sm">{u.matricule ?? '—'}</td>
                  <td className="p-3 text-sm">{u.phone ?? '—'}</td>
                  <td className="p-3"><span className="px-2 py-0.5 bg-slate-100 rounded text-sm">{u.role}</span></td>
                  <td className="p-3">
                    {u.profileValidated ? (
                      <span className="text-green-600 text-sm font-medium">Validé</span>
                    ) : (
                      <span className="text-amber-600 text-sm">En attente</span>
                    )}
                  </td>
                  <td className="p-3 text-sm text-slate-600">{new Date(u.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td className="p-3">
                    <div className="flex gap-2 flex-wrap">
                      <button type="button" onClick={() => openEdit(u)} className="text-sm text-blue-600 hover:underline">Modifier</button>
                      <button type="button" onClick={() => openIdentity(u)} className="text-sm text-slate-600 hover:underline">Identité</button>
                      {!isAdmin && (
                        <button
                          type="button"
                          onClick={() => deleteOne(u.id)}
                          className="text-sm text-red-600 hover:underline"
                        >
                          Supprimer
                        </button>
                      )}
                      {!u.profileValidated && (
                        <button type="button" onClick={() => validateProfile(u.id)} className="text-sm text-green-600 hover:underline">Valider le profil</button>
                      )}
                      {u.profileValidated && (
                        <button type="button" onClick={() => openBadge(u.id)} className="text-sm text-slate-600 hover:underline">Voir le badge</button>
                      )}
                    </div>
                  </td>
                </tr>
              ); })
            )}
          </tbody>
        </table>
      </div>

      {badgeUserId && badgeData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setBadgeUserId(null)}>
          <div
            className={`bg-white rounded-xl shadow-xl w-full p-6 ${badgeData.role === 'TEACHER' ? 'max-w-2xl' : 'max-w-md'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-800 mb-2">Badge — {badgeData.firstName} {badgeData.lastName}</h3>
            <div className="flex flex-wrap items-center gap-2 mb-4 text-sm text-slate-600">
              <span>
                Statut badge :{' '}
                <strong className={badgeData.badgeActive === false ? 'text-amber-700' : 'text-emerald-700'}>
                  {badgeData.badgeActive === false ? 'désactivé' : 'actif'}
                </strong>
                {' · '}
                QR v{badgeData.badgeQrVersion ?? 1}
              </span>
              <button
                type="button"
                disabled={badgeActionLoading}
                onClick={() => void setBadgeActiveRemote(badgeData.badgeActive === false)}
                className="rounded border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                {badgeData.badgeActive === false ? 'Activer' : 'Désactiver'}
              </button>
              <button
                type="button"
                disabled={badgeActionLoading || badgeData.badgeActive === false}
                onClick={() => void regenerateBadgeQrRemote()}
                className="rounded border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
                title={badgeData.badgeActive === false ? 'Réactivez le badge avant de régénérer le QR.' : ''}
              >
                Régénérer le QR
              </button>
            </div>
            {badgeData.role === 'TEACHER' && badgeData.presenceQrContent && badgeData.person?.matricule ? (
              <div className="flex flex-col items-center gap-4">
                <TeacherBadgeCard
                  firstName={badgeData.firstName}
                  lastName={badgeData.lastName}
                  jobTitle={badgeData.jobTitle}
                  teacherContract={badgeData.person.teacher?.typeContrat}
                  personMatricule={badgeData.person.matricule}
                  rhMatricule={badgeData.matricule}
                  dateNaissancePerson={badgeData.person.dateNaissance ?? null}
                  dateNaissanceUser={badgeData.dateOfBirth ?? null}
                  hireDate={badgeData.hireDate ?? null}
                  profilePhotoUrl={badgeData.profilePhotoUrl}
                  badgeBarcode={badgeData.badgeBarcode ?? ''}
                  presenceQrContent={badgeData.presenceQrContent}
                  establishmentName={badgeData.appName}
                  logoUrl={badgeData.logoUrl}
                  websiteUrl={badgeData.websiteUrl}
                  primaryColor={badgeData.primaryColor}
                  annéeUniv={badgeData.annéeUniv}
                />
                <p className="text-xs text-slate-500 text-center max-w-md">
                  QR signé (GEST1) : présence journalière par scan. Les anciens QR deviennent invalides après régénération.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                {badgeData.profilePhotoUrl ? (
                  <img src={`${API_URL}${badgeData.profilePhotoUrl}`} alt="" className="w-24 h-24 rounded-full object-cover border-2 border-slate-200" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-2xl font-bold">
                    {badgeData.firstName[0]}{badgeData.lastName[0]}
                  </div>
                )}
                <div className="text-center">
                  <p className="font-semibold text-slate-800">{badgeData.firstName} {badgeData.lastName}</p>
                  <p className="text-sm text-slate-600">{badgeData.role}</p>
                  <p className="text-sm text-slate-600">{badgeData.email}</p>
                  {badgeData.phone && <p className="text-sm text-slate-600">{badgeData.phone}</p>}
                </div>
                <div className="w-full flex justify-center">
                  <canvas ref={barcodeCanvasRef} />
                </div>
                <p className="text-xs text-slate-500">Code-barres unique — pointage aux bornes</p>
                {badgeData.qrPayload ? (
                  <div className="bg-white p-2 rounded border">
                    <QRCodeSVG value={badgeData.qrPayload} size={120} level="M" />
                  </div>
                ) : (
                  <p className="text-xs text-amber-700 text-center max-w-xs">
                    Aucun QR sécurisé (badge désactivé ou compte inactif).
                  </p>
                )}
                <p className="text-xs text-slate-500">QR signé — même contenu que sur le PDF badge</p>
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => setBadgeUserId(null)} className="px-4 py-2 bg-slate-200 rounded hover:bg-slate-300">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
