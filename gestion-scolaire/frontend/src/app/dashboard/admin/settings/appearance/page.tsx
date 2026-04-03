'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, apiUpload } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { useTheme } from '@/contexts/ThemeContext';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ThemeImage } from '@/components/ui/theme-image';
import { getThemeImageSrc } from '@/lib/theme-images';

type ThemeSettings = {
  appName?: string | null;
  websiteUrl?: string | null;
  logoUrl?: string | null;
  logoLoginUrl?: string | null;
  /** Cachet pour documents PDF (facture proforma) */
  stampUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  successColor?: string | null;
  dangerColor?: string | null;
  backgroundColor?: string | null;
  sidebarColor?: string | null;
};

const DEFAULT_COLORS: ThemeSettings = {
  primaryColor: '#2563eb',
  secondaryColor: '#64748b',
  successColor: '#16a34a',
  dangerColor: '#dc2626',
  backgroundColor: '#f8fafc',
  sidebarColor: '#ffffff',
};

/** Aperçu : URLs blob en ref + forceUpdate pour que l’image s’affiche tout de suite. */
function usePreviewUrls() {
  const previewRef = useRef<{ logo: string | null; logoLogin: string | null; favicon: string | null; stamp: string | null }>({
    logo: null,
    logoLogin: null,
    favicon: null,
    stamp: null,
  });
  const [, forceUpdate] = useState(0);
  const revokeRef = useRef<Set<string>>(new Set());

  const setPreview = useCallback((type: 'logo' | 'logoLogin' | 'favicon' | 'stamp', url: string | null) => {
    const old = previewRef.current[type];
    if (old && revokeRef.current.has(old)) {
      try {
        URL.revokeObjectURL(old);
      } catch {}
      revokeRef.current.delete(old);
    }
    previewRef.current[type] = url;
    if (url) revokeRef.current.add(url);
    forceUpdate((n) => n + 1);
  }, []);

  useEffect(() => {
    return () => {
      revokeRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      });
      revokeRef.current.clear();
    };
  }, []);

  return [previewRef.current, setPreview] as const;
}

export default function AppearancePage() {
  const router = useRouter();
  const toast = useToast();
  const { refresh: refreshTheme } = useTheme();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'logoLogin' | 'favicon' | 'stamp' | null>(null);
  const [form, setForm] = useState<ThemeSettings>({ ...DEFAULT_COLORS });
  const [previews, setPreview] = usePreviewUrls();
  const fileInputRefs = useRef<{
    logo: HTMLInputElement | null;
    logoLogin: HTMLInputElement | null;
    favicon: HTMLInputElement | null;
    stamp: HTMLInputElement | null;
  }>({
    logo: null,
    logoLogin: null,
    favicon: null,
    stamp: null,
  });

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setRole((JSON.parse(u) as { role?: string }).role ?? null);
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const data = await api<ThemeSettings>('/appearance/settings');
      setForm((prev) => ({
        ...DEFAULT_COLORS,
        ...prev,
        ...data,
      }));
    } catch {
      setForm((prev) => ({ ...DEFAULT_COLORS, ...prev }));
    } finally {
      setLoading(false);
    }
  }, []);

  const canManage = role === 'ADMIN' || role === 'SUPER_ADMIN';

  useEffect(() => {
    if (role === null) return;
    if (!canManage) {
      toast.error('Accès réservé aux administrateurs.');
      router.replace('/dashboard/admin');
      return;
    }
    loadSettings();
  }, [role, router, loadSettings, toast, canManage]);

  const handleFileUpload = async (type: 'logo' | 'logoLogin' | 'favicon' | 'stamp', file: File) => {
    if (!canManage) return;
    if (!file || file.size === 0) {
      toast.error('Fichier vide ou inaccessible.');
      return;
    }
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];
    if (!allowed.includes(file.type) && !file.type.startsWith('image/')) {
      toast.error('Type de fichier non autorisé (images ou favicon .ico).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 2 Mo).');
      return;
    }
    let objectUrl: string;
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      toast.error('Impossible de prévisualiser ce fichier.');
      return;
    }
    setPreview(type, objectUrl);
    setUploading(type);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await apiUpload<{ url?: string; data?: { url?: string } }>(`/appearance/upload?type=${type}`, formData);
      const url = result?.url ?? result?.data?.url;
      if (url && typeof url === 'string') {
        const key =
          type === 'logo'
            ? 'logoUrl'
            : type === 'logoLogin'
              ? 'logoLoginUrl'
              : type === 'favicon'
                ? 'faviconUrl'
                : 'stampUrl';
        setForm((f) => {
          const next = { ...f, [key]: url };
          void (async () => {
            try {
              await api('/appearance/settings', { method: 'PATCH', body: JSON.stringify(next) });
              await refreshTheme();
              const msg =
                type === 'favicon'
                  ? 'Favicon enregistré et appliqué.'
                  : type === 'stamp'
                    ? 'Cachet enregistré (affiché sur la facture proforma PDF).'
                    : 'Logo enregistré et appliqué sur toute la plateforme.';
              toast.success(msg);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Impossible d’enregistrer le média.');
            }
          })();
          return next;
        });
      } else {
        toast.error('Réponse serveur invalide (URL manquante).');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du chargement du fichier.');
      setPreview(type, null);
      setForm((f) => ({
        ...f,
        ...(type === 'logo' ? { logoUrl: null } : type === 'logoLogin' ? { logoLoginUrl: null } : { faviconUrl: null }),
      }));
    } finally {
      setUploading(null);
      const ref = fileInputRefs.current[type];
      if (ref) ref.value = '';
    }
  };

  const removePreview = useCallback(
    (type: 'logo' | 'logoLogin' | 'favicon' | 'stamp') => {
      setPreview(type, null);
      const key =
        type === 'logo'
          ? 'logoUrl'
          : type === 'logoLogin'
            ? 'logoLoginUrl'
            : type === 'favicon'
              ? 'faviconUrl'
              : 'stampUrl';
      setForm((f) => {
        const next = { ...f, [key]: null };
        void (async () => {
          try {
            await api('/appearance/settings', { method: 'PATCH', body: JSON.stringify(next) });
            await refreshTheme();
            toast.success('Média retiré et enregistré.');
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Erreur lors de la suppression.');
          }
        })();
        return next;
      });
    },
    [setPreview, refreshTheme, toast],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        appName: form.appName?.trim() || null,
        websiteUrl: form.websiteUrl?.trim() || null,
      };
      await api('/appearance/settings', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      await refreshTheme();
      setPreview('logo', null);
      setPreview('logoLogin', null);
      setPreview('favicon', null);
      setPreview('stamp', null);
      toast.success('Thème enregistré et appliqué.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l’enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  if (role === null) {
    return (
      <div className="p-6">
        <Spinner label="Chargement du profil…" />
      </div>
    );
  }

  if (!canManage) {
    return <div className="p-6 text-sm text-slate-600">Accès réservé aux administrateurs. Redirection…</div>;
  }

  if (loading) {
    return <Spinner label="Chargement des paramètres..." />;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Identité & apparence"
        description="Nom de l’établissement, logos, cachet (facture proforma PDF), favicon et couleurs. Accessible aux administrateurs (ADMIN et Super Admin). Les fichiers sont enregistrés automatiquement après upload."
      >
        <Link href="/dashboard/admin">
          <Button variant="secondary" size="sm">← Retour Admin</Button>
        </Link>
      </PageHeader>

      <Card
        title="Personnalisation"
        description="Le nom, les couleurs et le logo définissent l’identité sur toute la plateforme et sur la facture proforma (PDF). Le cachet n’apparaît que sur les PDF officiels. Les médias sont sauvegardés dès l’upload. Utilisez « Enregistrer » pour le nom et les couleurs."
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Nom de l’établissement / plateforme</label>
            <p className="text-xs text-slate-500 mb-2">
              Affiché sur la page de connexion, la barre du haut, le menu latéral et le titre de l’onglet du navigateur.
            </p>
            <input
              type="text"
              value={form.appName ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, appName: e.target.value || null }))}
              placeholder="Ex. Université de …"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Site web (badge & affichage)</label>
            <p className="text-xs text-slate-500 mb-2">
              Affiché sous le nom de l’établissement sur le PDF badge (ex. <code className="bg-slate-100 px-1 rounded">www.mon-etablissement.edu</code>
              ).
            </p>
            <input
              type="text"
              value={form.websiteUrl ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value || null }))}
              placeholder="www.exemple.edu"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Logos & Favicon (fichiers)</h3>
            <p className="text-xs text-slate-500 mb-3">
              PNG, JPG, SVG ou ICO. Max 2 Mo. Les fichiers passent par le serveur puis sont servis via{' '}
              <code className="bg-slate-100 px-1 rounded">/uploads/appearance/</code> (proxy Next → API). Sans upload, vous
              pouvez placer <code className="bg-slate-100 px-1 rounded">logo.png</code>,{' '}
              <code className="bg-slate-100 px-1 rounded">logo-login.png</code> et{' '}
              <code className="bg-slate-100 px-1 rounded">favicon.ico</code> dans{' '}
              <code className="bg-slate-100 px-1 rounded">frontend/public/</code>.
            </p>
            <div className="grid gap-6 sm:grid-cols-1">
              {/* Logo navbar */}
              <div className="space-y-2">
                <span className="block text-sm font-medium text-slate-700">Logo navbar</span>
                <input
                  ref={(el) => { fileInputRefs.current.logo = el; }}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
                  className="block w-full text-sm text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload('logo', f);
                  }}
                  disabled={uploading !== null}
                />
                {uploading === 'logo' && <Spinner label="Chargement…" />}
                {(previews.logo || form.logoUrl) && (
                  <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="text-xs font-medium text-slate-500 mb-2">Fichier chargé — aperçu avant validation</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <ThemeImage
                        src={previews.logo ?? (form.logoUrl ? getThemeImageSrc(form.logoUrl) : undefined)}
                        alt="Aperçu logo navbar"
                        className="h-14 max-w-[220px] rounded border border-slate-200 bg-white p-1"
                        placeholderClassName="min-h-[56px] min-w-[180px] rounded bg-slate-200 animate-pulse"
                        fallback={<span className="text-xs text-slate-400">Aperçu indisponible</span>}
                      />
                      <Button type="button" variant="secondary" size="sm" onClick={() => removePreview('logo')}>Retirer</Button>
                    </div>
                    {form.logoUrl && <p className="text-xs text-slate-400 mt-1">Chemin enregistré : {form.logoUrl}</p>}
                  </div>
                )}
              </div>

              {/* Logo page de connexion */}
              <div className="space-y-2">
                <span className="block text-sm font-medium text-slate-700">Logo page de connexion</span>
                <input
                  ref={(el) => { fileInputRefs.current.logoLogin = el; }}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
                  className="block w-full text-sm text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload('logoLogin', f);
                  }}
                  disabled={uploading !== null}
                />
                {uploading === 'logoLogin' && <Spinner label="Chargement…" />}
                {(previews.logoLogin || form.logoLoginUrl) && (
                  <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="text-xs font-medium text-slate-500 mb-2">Fichier chargé — aperçu avant validation</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <ThemeImage
                        src={previews.logoLogin ?? (form.logoLoginUrl ? getThemeImageSrc(form.logoLoginUrl) : undefined)}
                        alt="Aperçu logo connexion"
                        className="h-14 max-w-[220px] rounded border border-slate-200 bg-white p-1"
                        placeholderClassName="min-h-[56px] min-w-[180px] rounded bg-slate-200 animate-pulse"
                        fallback={<span className="text-xs text-slate-400">Aperçu indisponible</span>}
                      />
                      <Button type="button" variant="secondary" size="sm" onClick={() => removePreview('logoLogin')}>Retirer</Button>
                    </div>
                    {form.logoLoginUrl && <p className="text-xs text-slate-400 mt-1">URL : {form.logoLoginUrl}</p>}
                  </div>
                )}
              </div>

              {/* Favicon */}
              <div className="space-y-2">
                <span className="block text-sm font-medium text-slate-700">Favicon</span>
                <input
                  ref={(el) => { fileInputRefs.current.favicon = el; }}
                  type="file"
                  accept="image/x-icon,image/vnd.microsoft.icon,image/png,image/svg+xml"
                  className="block w-full text-sm text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload('favicon', f);
                  }}
                  disabled={uploading !== null}
                />
                {uploading === 'favicon' && <Spinner label="Chargement…" />}
                {(previews.favicon || form.faviconUrl) && (
                  <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="text-xs font-medium text-slate-500 mb-2">Fichier chargé — aperçu avant validation</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <ThemeImage
                        src={previews.favicon ?? (form.faviconUrl ? getThemeImageSrc(form.faviconUrl) : undefined)}
                        alt="Aperçu favicon"
                        className="h-12 w-12 rounded border border-slate-200 bg-white p-1"
                        placeholderClassName="min-h-[48px] min-w-[48px] rounded bg-slate-200 animate-pulse"
                        fallback={<span className="text-xs text-slate-400">Aperçu indisponible</span>}
                      />
                      <Button type="button" variant="secondary" size="sm" onClick={() => removePreview('favicon')}>Retirer</Button>
                    </div>
                    {form.faviconUrl && <p className="text-xs text-slate-400 mt-1">URL : {form.faviconUrl}</p>}
                  </div>
                )}
              </div>

              {/* Cachet (facture proforma PDF) */}
              <div className="space-y-2 border-t border-slate-200 pt-4">
                <span className="block text-sm font-medium text-slate-700">Cachet de l’établissement (PDF)</span>
                <p className="text-xs text-slate-500">
                  Affiché en bas de la <strong>facture proforma</strong> avec le nom, le logo et les couleurs configurés ci-dessus.
                  Préférez <strong>PNG ou JPG</strong> : le moteur PDF n’intègre pas le SVG pour le cachet.
                </p>
                <input
                  ref={(el) => { fileInputRefs.current.stamp = el; }}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  className="block w-full text-sm text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload('stamp', f);
                  }}
                  disabled={uploading !== null}
                />
                {uploading === 'stamp' && <Spinner label="Chargement…" />}
                {(previews.stamp || form.stampUrl) && (
                  <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="text-xs font-medium text-slate-500 mb-2">Aperçu du cachet</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <ThemeImage
                        src={previews.stamp ?? (form.stampUrl ? getThemeImageSrc(form.stampUrl) : undefined)}
                        alt="Aperçu cachet"
                        className="h-24 max-w-[200px] rounded border border-slate-200 bg-white p-1 object-contain"
                        placeholderClassName="min-h-[96px] min-w-[120px] rounded bg-slate-200 animate-pulse"
                        fallback={<span className="text-xs text-slate-400">Aperçu indisponible</span>}
                      />
                      <Button type="button" variant="secondary" size="sm" onClick={() => removePreview('stamp')}>Retirer</Button>
                    </div>
                    {form.stampUrl && <p className="text-xs text-slate-400 mt-1">URL : {form.stampUrl}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Couleurs (hex)</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { key: 'primaryColor' as const, label: 'Couleur principale' },
                { key: 'secondaryColor' as const, label: 'Secondaire' },
                { key: 'successColor' as const, label: 'Succès' },
                { key: 'dangerColor' as const, label: 'Danger' },
                { key: 'backgroundColor' as const, label: 'Fond général' },
                { key: 'sidebarColor' as const, label: 'Sidebar / header' },
              ].map(({ key, label }) => (
                <label key={key} className="block">
                  <span className="block text-sm text-slate-600 mb-1">{label}</span>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={form[key] ?? '#000000'}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="h-9 w-14 rounded border border-slate-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={form[key] ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value || null }))}
                      placeholder="#000000"
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                    />
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" loading={saving}>
              Enregistrer nom &amp; couleurs
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setForm((f) => ({
                  ...DEFAULT_COLORS,
                  appName: f.appName,
                  websiteUrl: f.websiteUrl,
                  logoUrl: f.logoUrl,
                  logoLoginUrl: f.logoLoginUrl,
                  faviconUrl: f.faviconUrl,
                  stampUrl: f.stampUrl,
                }))
              }
            >
              Réinitialiser les couleurs uniquement
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
