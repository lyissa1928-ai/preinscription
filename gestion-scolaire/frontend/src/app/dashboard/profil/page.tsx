'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { BackLink } from '@/components/ui/back-link';
import { useToast } from '@/contexts/ToastContext';
import { api, apiUpload, getApiUrl } from '@/lib/api';

type User = {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl?: string | null;
};

type TeacherMe = {
  person: { id: string };
  teacher: { bioAcademique?: string | null };
  user: { id: string; email: string; firstName: string; lastName: string; profilePhotoUrl?: string | null };
};

export default function ProfilPage() {
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [teacherMe, setTeacherMe] = useState<TeacherMe | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '' });
  const [bio, setBio] = useState('');
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<User>('/auth/me')
      .then((u) => {
        setUser(u);
        setForm({ firstName: u.firstName, lastName: u.lastName });
        if (u.role === 'TEACHER') {
          return api<TeacherMe>('/persons/teachers/me').then((t) => {
            setTeacherMe(t);
            setBio(t.teacher.bioAcademique ?? '');
          });
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api<User & { profilePhotoUrl?: string | null }>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      setUser(updated);
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        localStorage.setItem(
          'user',
          JSON.stringify({
            ...parsed,
            firstName: updated.firstName,
            lastName: updated.lastName,
            ...(updated.profilePhotoUrl !== undefined && { profilePhotoUrl: updated.profilePhotoUrl }),
          }),
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiUpload<{ profilePhotoUrl: string }>('/users/me/photo', fd);
      setUser((u) => (u ? { ...u, profilePhotoUrl: res.profilePhotoUrl } : null));
      setTeacherMe((t) => (t ? { ...t, user: { ...t.user, profilePhotoUrl: res.profilePhotoUrl } } : null));
      try {
        const stored = localStorage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored);
          localStorage.setItem('user', JSON.stringify({ ...parsed, profilePhotoUrl: res.profilePhotoUrl }));
        }
      } catch {
        /* ignore */
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du téléversement.');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleBioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/persons/teachers/me/bio', {
        method: 'PATCH',
        body: JSON.stringify({ bioAcademique: bio || undefined }),
      });
      setTeacherMe((t) => (t ? { ...t, teacher: { ...t.teacher, bioAcademique: bio || null } } : null));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword.length < 8) {
      toast.error('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setChangingPassword(true);
    try {
      await api('/auth/me/password', {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      toast.success('Mot de passe modifié.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-slate-500">Chargement...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-slate-500">
        Impossible de charger le profil.
        <BackLink href="/dashboard" className="ml-2 text-blue-600 hover:text-blue-700">Retour</BackLink>
      </div>
    );
  }

  const photoUrl = user.profilePhotoUrl ?? teacherMe?.user?.profilePhotoUrl;
  const apiBase = getApiUrl();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Mon profil</h1>
      <p className="mt-2 text-slate-600">
        Modifiez vos informations personnelles. Chaque utilisateur connecté peut déposer une <strong>photo de profil</strong> : elle apparaît dans le menu latéral, l’en-tête et, selon les cas, sur les badges ou documents officiels.
      </p>

      <div className="mt-6 flex flex-wrap gap-8">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">Photo de profil</label>
          <div className="flex items-center gap-4">
            <div className="h-24 w-24 rounded-full border-2 border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center">
              {photoUrl ? (
                <img src={`${apiBase}${photoUrl}`} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-slate-400 text-2xl">{user.firstName?.[0]}{user.lastName?.[0]}</span>
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={handlePhotoChange}
              />
              <button
                type="button"
                disabled={uploadingPhoto}
                onClick={() => fileInputRef.current?.click()}
                className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {uploadingPhoto ? 'Téléversement...' : 'Modifier la photo'}
              </button>
              <p className="mt-1 text-xs text-slate-500">JPEG ou PNG, tous rôles (enseignant, étudiant, administration, comptabilité…).</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="max-w-md flex-1 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="mt-1 w-full rounded border border-slate-300 bg-slate-100 px-3 py-2 text-slate-500"
            />
            <p className="mt-1 text-xs text-slate-500">L&apos;email ne peut pas être modifié</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Rôle</label>
            <input
              type="text"
              value={user.role}
              disabled
              className="mt-1 w-full rounded border border-slate-300 bg-slate-100 px-3 py-2 text-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Prénom</label>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Nom</label>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              required
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <Link
              href="/dashboard"
              className="rounded border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
            >
              Annuler
            </Link>
          </div>
        </form>
      </div>

      <form onSubmit={handlePasswordSubmit} className="mt-8 max-w-md space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">Changer mon mot de passe</h2>
        <p className="text-sm text-slate-600">Après modification, utilisez le nouveau mot de passe à la prochaine connexion (identifiant : email ou matricule).</p>
        <div>
          <label className="block text-sm font-medium text-slate-700">Mot de passe actuel</label>
          <input
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            required
            autoComplete="current-password"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Nouveau mot de passe (min. 8 caractères)</label>
          <input
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Confirmer le nouveau mot de passe</label>
          <input
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <button
          type="submit"
          disabled={changingPassword}
          className="rounded bg-slate-700 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {changingPassword ? 'Modification...' : 'Changer le mot de passe'}
        </button>
      </form>

      {user.role === 'TEACHER' && (
        <form onSubmit={handleBioSubmit} className="mt-8 max-w-2xl">
          <h2 className="text-lg font-semibold text-slate-800">Résumé de parcours académique (Bio)</h2>
          <p className="mt-1 text-sm text-slate-600">Rédigez et mettez à jour votre résumé depuis votre espace personnel.</p>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={5}
            className="mt-2 w-full rounded border border-slate-300 px-3 py-2"
            placeholder="Parcours, domaines d’enseignement, recherches, publications..."
          />
          <div className="mt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-slate-700 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer la bio'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
