'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BackLink } from '@/components/ui/back-link';
import { api, apiUpload, downloadFile, getApiUrl } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

const STEPS = [
  { id: 1, title: 'Informations personnelles' },
  { id: 2, title: 'Parcours académique' },
  { id: 3, title: 'Contact d\'urgence' },
  { id: 4, title: 'Formation et inscription' },
];

const GROUPES_SANGUINS = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENRES = [{ value: '', label: '—' }, { value: 'M', label: 'Homme' }, { value: 'F', label: 'Femme' }, { value: 'Autre', label: 'Autre' }];
const NATIONALITES = ['Sénégalaise', 'Malienne', 'Mauritanienne', 'Ivoirienne', 'Française', 'Autre'];
const LIENS_PARENTE = ['', 'Père', 'Mère', 'Tuteur', 'Frère', 'Sœur', 'Autre'];

const PHOTO_ACCEPT = 'image/jpeg,image/png';
const DOC_ACCEPT = 'image/jpeg,image/png,image/gif,application/pdf';

type Formation = { id: string; code: string; nom: string };
type Campus = { id: string; code: string; nom: string; region?: string | null; departement?: string | null; regionNom?: string | null; departementNom?: string | null };
type Cohort = { id: string; nom: string; section: string; formationId: string; annee: number; campusId?: string | null };

export default function NouvelEtudiantPage() {
  const router = useRouter();
  const toast = useToast();
  const currentYear = new Date().getFullYear();
  const [step, setStep] = useState(1);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    cinOuPasseport: '',
    dateNaissance: '',
    lieuNaissance: '',
    nationalite: '',
    genre: '',
    telephone: '',
    adresse: '',
    photoProfil: '',
    dernierDiplome: '',
    anneeObtention: currentYear - 2,
    mention: '',
    etablissementOrigine: '',
    typeBac: '',
    justificatifBac: '',
    justificatifCni: '',
    nomTuteur: '',
    telephoneParent: '',
    telephoneTuteur: '',
    lienParente: '',
    groupeSanguin: '',
    antecedentsMedicaux: '',
    maladiesSignalees: '',
    formationId: '',
    campusId: '',
    cohortId: '',
    anneeUniv: currentYear,
    email: '',
  });

  // Charger toutes les formations (liste plate puis fallback hiérarchie si vide)
  const loadFormations = useCallback(() => {
    api<Formation[]>('/formations?includePending=true')
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          setFormations(list);
          return;
        }
        return api<Array<{ id: string; code: string; nom: string; formations?: Formation[] }>>('/formations/hierarchy?includePending=true').then((hierarchy) => {
          const flat: Formation[] = [];
          for (const f of hierarchy || []) {
            if (Array.isArray(f.formations)) for (const form of f.formations) flat.push({ id: form.id, code: form.code, nom: form.nom });
          }
          setFormations(flat);
        });
      })
      .catch((err) => {
        setFormations([]);
        toast.error(err?.message || 'Impossible de charger les formations.');
      });
  }, [toast]);

  useEffect(() => {
    loadFormations();
  }, [loadFormations]);

  // Recharger à l’étape 4 pour avoir la liste à jour
  const loadCampuses = useCallback(() => {
    api<Campus[]>('/campuses').then(setCampuses).catch(() => setCampuses([]));
  }, []);

  useEffect(() => {
    if (step === 4) {
      loadFormations();
      loadCampuses();
    }
  }, [step, loadFormations, loadCampuses]);

  useEffect(() => {
    if (!form.formationId || !form.anneeUniv) {
      setCohorts([]);
      return;
    }
    const params = new URLSearchParams({ formationId: form.formationId, annee: String(form.anneeUniv) });
    if (form.campusId) params.set('campusId', form.campusId);
    api<Cohort[]>(`/inscriptions/cohorts?${params}`)
      .then(setCohorts)
      .catch(() => setCohorts([]));
  }, [form.formationId, form.anneeUniv, form.campusId]);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [photoMode, setPhotoMode] = useState<'choice' | 'file' | 'webcam'>('choice');
  const [webcamReady, setWebcamReady] = useState(false);

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setWebcamReady(false);
    setPhotoMode((m) => (m === 'webcam' ? 'choice' : m));
  }, []);

  useEffect(() => {
    return () => { stopWebcam(); };
  }, [stopWebcam]);

  useEffect(() => {
    if (step !== 1) stopWebcam();
  }, [step, stopWebcam]);

  const startWebcam = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Votre navigateur ou appareil ne supporte pas la caméra.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } });
      streamRef.current = stream;
      setPhotoMode('webcam');
      setWebcamReady(false);
      await new Promise((r) => setTimeout(r, 100));
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setWebcamReady(true);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossible d\'accéder à la caméra.');
    }
  }, [toast]);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !streamRef.current) return;
    setUploading('photo');
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setUploading(null);
      toast.error('Erreur capture');
      return;
    }
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setUploading(null);
          toast.error('Erreur capture');
          return;
        }
        const file = new File([blob], 'photo-webcam.jpg', { type: 'image/jpeg' });
        if (file.size > 2 * 1024 * 1024) {
          toast.error('Photo trop volumineuse. Reprenez une photo.');
          setUploading(null);
          return;
        }
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', 'photo');
        try {
          const res = await apiUpload<{ path: string }>('/persons/students/upload', fd);
          setForm((f) => ({ ...f, photoProfil: res.path }));
          toast.success('Photo enregistrée.');
          stopWebcam();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Erreur upload');
        } finally {
          setUploading(null);
        }
      },
      'image/jpeg',
      0.9,
    );
  }, [toast, stopWebcam]);

  const handleFileUpload = async (type: 'photo' | 'justificatif_bac' | 'justificatif_cni', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (type === 'photo' && file.size > 2 * 1024 * 1024) {
      toast.error('Photo : taille max 2 Mo.');
      e.target.value = '';
      return;
    }
    setUploading(type);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type);
    try {
      const res = await apiUpload<{ path: string }>('/persons/students/upload', fd);
      setForm((f) => ({
        ...f,
        ...(type === 'photo' && { photoProfil: res.path }),
        ...(type === 'justificatif_bac' && { justificatifBac: res.path }),
        ...(type === 'justificatif_cni' && { justificatifCni: res.path }),
      }));
      toast.success('Fichier enregistré.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur upload';
      toast.error(msg === 'Photo : JPEG ou PNG uniquement.' ? 'Photo : format JPEG ou PNG uniquement, max 2 Mo.' : msg);
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  const validateStep = (s: number): string | null => {
    if (s === 1) {
      if (!form.nom.trim()) return 'Nom requis.';
      if (!form.prenom.trim()) return 'Prénom requis.';
      if (!form.cinOuPasseport.trim()) return 'CIN ou Passeport requis.';
      if (form.telephone.trim() && !/^[\d\s+.-]{8,}$/.test(form.telephone)) return 'Téléphone invalide.';
    }
    if (s === 4) {
      if (!form.campusId) return 'Le campus est obligatoire.';
      if (!form.formationId || !form.cohortId) return 'Formation et classe requises.';
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      toast.error(err);
      return;
    }
    if (step < 4) setStep(step + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateStep(4);
    if (err) {
      toast.error(err);
      return;
    }
    setSubmitting(true);
    try {
      const created = await api<{ id: string; matricule: string }>('/persons/students/inscription', {
        method: 'POST',
        body: JSON.stringify({
          nom: form.nom.trim(),
          prenom: form.prenom.trim(),
          cinOuPasseport: form.cinOuPasseport.trim(),
          formationId: form.formationId,
          cohortId: form.cohortId,
          campusId: form.campusId || null,
          anneeUniv: form.anneeUniv,
          dateNaissance: form.dateNaissance || undefined,
          lieuNaissance: form.lieuNaissance.trim() || undefined,
          nationalite: form.nationalite || undefined,
          genre: form.genre || undefined,
          telephone: form.telephone.trim() || undefined,
          adresse: form.adresse.trim() || undefined,
          photoProfil: form.photoProfil || undefined,
          dernierDiplome: form.dernierDiplome.trim() || undefined,
          anneeObtention: form.anneeObtention || undefined,
          mention: form.mention.trim() || undefined,
          etablissementOrigine: form.etablissementOrigine.trim() || undefined,
          typeBac: form.typeBac.trim() || undefined,
          nomTuteur: form.nomTuteur.trim() || undefined,
          telephoneParent: form.telephoneParent.trim() || undefined,
          telephoneTuteur: form.telephoneTuteur.trim() || undefined,
          lienParente: form.lienParente || undefined,
          groupeSanguin: form.groupeSanguin || undefined,
          antecedentsMedicaux: form.antecedentsMedicaux.trim() || undefined,
          maladiesSignalees: form.maladiesSignalees.trim() || undefined,
          justificatifBac: form.justificatifBac || undefined,
          justificatifCni: form.justificatifCni || undefined,
          email: form.email.trim() || undefined,
        }),
      });
      toast.success('Étudiant inscrit. Le matricule ETU-YYYY-XXXX et le mot de passe ont été générés.');
      if (created?.id) {
        try {
          await downloadFile(
            `/persons/students/${created.id}/fiche-inscription`,
            `fiche-inscription-${created.matricule ?? created.id}.pdf`,
          );
          toast.success('Fiche d’inscription PDF téléchargée.');
        } catch (pdfErr) {
          toast.error(pdfErr instanceof Error ? pdfErr.message : 'Impossible de générer le PDF pour le moment.');
        }
      }
      router.push('/dashboard/scolarite/etudiants');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <BackLink href="/dashboard/scolarite/etudiants" className="text-sm text-slate-600 hover:text-slate-800 mb-2 inline-block">← Retour aux étudiants</BackLink>
      <h1 className="text-2xl font-bold text-slate-800">Inscription étudiant</h1>
      <p className="mt-1 text-slate-600 text-sm">Formulaire en 4 étapes. Le matricule (ETU-YYYY-XXXX) et le mot de passe initial sont générés automatiquement.</p>

      {/* Steps indicator */}
      <div className="mt-6 flex flex-wrap gap-2">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStep(s.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${step === s.id ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {s.id}. {s.title}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 p-6 bg-white rounded-xl shadow border border-slate-200">
        {/* Step 1: Informations personnelles */}
        {step === 1 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">1. Informations personnelles</h2>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="flex flex-col items-center gap-2">
                  <span className="block text-sm font-medium text-slate-700">Photo</span>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept={PHOTO_ACCEPT}
                    onChange={(e) => { handleFileUpload('photo', e); setPhotoMode('choice'); }}
                    className="sr-only"
                    id="photo-upload"
                    aria-label="Choisir une photo"
                  />
                  {photoMode === 'choice' && (
                    <>
                      <div className="flex flex-col gap-2 w-full max-w-[200px]">
                        <label
                          htmlFor="photo-upload"
                          className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50 cursor-pointer text-center"
                        >
                          Choisir un fichier
                        </label>
                        <button
                          type="button"
                          onClick={startWebcam}
                          className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50 flex items-center justify-center gap-2"
                        >
                          <span className="inline-block w-5 h-5 rounded-full bg-slate-400" aria-hidden /> Prendre une photo
                        </button>
                      </div>
                      <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs overflow-hidden bg-slate-50 flex-shrink-0">
                        {uploading === 'photo' ? (
                          <span className="text-slate-500">...</span>
                        ) : form.photoProfil ? (
                          <img
                            src={getApiUrl() + form.photoProfil}
                            alt="Photo profil"
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <span className="text-center px-1">—</span>
                        )}
                      </div>
                    </>
                  )}
                  {photoMode === 'webcam' && (
                    <div className="flex flex-col gap-2">
                      <div className="relative w-48 h-36 rounded-lg overflow-hidden bg-slate-900">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover mirror"
                          style={{ transform: 'scaleX(-1)' }}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={capturePhoto}
                          disabled={!webcamReady || uploading === 'photo'}
                          className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm hover:bg-slate-700 disabled:opacity-50"
                        >
                          {uploading === 'photo' ? 'Envoi...' : 'Capturer'}
                        </button>
                        <button
                          type="button"
                          onClick={stopWebcam}
                          className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                  <span className="text-xs text-slate-500">JPEG ou PNG, max 2 Mo</span>
                </div>
                <div className="flex-1 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nom *</label>
                    <input type="text" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Prénom *</label>
                    <input type="text" value={form.prenom} onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">CIN ou N° Passeport *</label>
                    <input type="text" value={form.cinOuPasseport} onChange={(e) => setForm((f) => ({ ...f, cinOuPasseport: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required placeholder="Ex: 1234567890123" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date de naissance</label>
                    <input type="date" value={form.dateNaissance} onChange={(e) => setForm((f) => ({ ...f, dateNaissance: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Lieu de naissance</label>
                    <input type="text" value={form.lieuNaissance} onChange={(e) => setForm((f) => ({ ...f, lieuNaissance: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nationalité</label>
                    <select value={form.nationalite} onChange={(e) => setForm((f) => ({ ...f, nationalite: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                      <option value="">—</option>
                      {NATIONALITES.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Genre</label>
                    <select value={form.genre} onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                      {GENRES.map((g) => (
                        <option key={g.value || 'x'} value={g.value}>{g.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
                    <input type="tel" value={form.telephone} onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Ex: +221 77 123 45 67" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Adresse</label>
                    <input type="text" value={form.adresse} onChange={(e) => setForm((f) => ({ ...f, adresse: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Step 2: Parcours académique */}
        {step === 2 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">2. Parcours académique</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dernier diplôme</label>
                <input type="text" value={form.dernierDiplome} onChange={(e) => setForm((f) => ({ ...f, dernierDiplome: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Ex: Baccalauréat" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Année d&apos;obtention</label>
                <input type="number" min={1990} max={currentYear} value={form.anneeObtention || ''} onChange={(e) => setForm((f) => ({ ...f, anneeObtention: e.target.value ? +e.target.value : currentYear - 2 }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mention</label>
                <input type="text" value={form.mention} onChange={(e) => setForm((f) => ({ ...f, mention: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Ex: Assez bien" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Établissement d&apos;origine</label>
                <input type="text" value={form.etablissementOrigine} onChange={(e) => setForm((f) => ({ ...f, etablissementOrigine: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Type bac (ou équivalent)</label>
                <input type="text" value={form.typeBac} onChange={(e) => setForm((f) => ({ ...f, typeBac: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Ex: S2, L, D" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Justificatif diplôme (Bac)</label>
                <input type="file" accept={DOC_ACCEPT} onChange={(e) => handleFileUpload('justificatif_bac', e)} className="w-full text-sm text-slate-600" />
                {form.justificatifBac && <p className="text-xs text-green-600 mt-1">Fichier enregistré</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Justificatif CNI / Passeport</label>
                <input type="file" accept={DOC_ACCEPT} onChange={(e) => handleFileUpload('justificatif_cni', e)} className="w-full text-sm text-slate-600" />
                {form.justificatifCni && <p className="text-xs text-green-600 mt-1">Fichier enregistré</p>}
              </div>
            </div>
          </section>
        )}

        {/* Step 3: Contact d'urgence */}
        {step === 3 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">3. Contact d&apos;urgence</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom du tuteur / contact</label>
                <input type="text" value={form.nomTuteur} onChange={(e) => setForm((f) => ({ ...f, nomTuteur: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone tuteur</label>
                <input type="tel" value={form.telephoneTuteur} onChange={(e) => setForm((f) => ({ ...f, telephoneTuteur: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone parent</label>
                <input type="tel" value={form.telephoneParent} onChange={(e) => setForm((f) => ({ ...f, telephoneParent: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lien de parenté</label>
                <select value={form.lienParente} onChange={(e) => setForm((f) => ({ ...f, lienParente: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                  {LIENS_PARENTE.map((l) => (
                    <option key={l || 'x'} value={l}>{l || '—'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Groupe sanguin</label>
                <select value={form.groupeSanguin} onChange={(e) => setForm((f) => ({ ...f, groupeSanguin: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                  {GROUPES_SANGUINS.map((g) => (
                    <option key={g || 'x'} value={g}>{g || '—'}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Antécédents médicaux</label>
                <textarea value={form.antecedentsMedicaux} onChange={(e) => setForm((f) => ({ ...f, antecedentsMedicaux: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" rows={2} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Maladies signalées</label>
                <textarea value={form.maladiesSignalees} onChange={(e) => setForm((f) => ({ ...f, maladiesSignalees: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" rows={2} />
              </div>
            </div>
          </section>
        )}

        {/* Step 4: Formation et inscription */}
        {step === 4 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">4. Formation et inscription</h2>
            {formations.length === 0 && (
              <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                Aucune formation disponible. Créez d’abord une formation (et validez-la si votre établissement utilise la validation) depuis{' '}
                <Link href="/dashboard/scolarite/formations" className="font-medium underline hover:no-underline">Filières et formations</Link>.
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Campus *</label>
                <select value={form.campusId} onChange={(e) => setForm((f) => ({ ...f, campusId: e.target.value, cohortId: '' }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required>
                  <option value="">— Choisir —</option>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} – {c.nom}{c.departementNom ? ` (${c.departementNom})` : c.regionNom ? ` (${c.regionNom})` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">Obligatoire pour l&apos;affectation après validation du dossier.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Formation cible *</label>
                <select value={form.formationId} onChange={(e) => setForm((f) => ({ ...f, formationId: e.target.value, cohortId: '' }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required>
                  <option value="">— Choisir —</option>
                  {formations.map((f) => (
                    <option key={f.id} value={f.id}>{f.code} – {f.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Année universitaire *</label>
                <input type="number" min={currentYear - 2} max={currentYear + 1} value={form.anneeUniv} onChange={(e) => setForm((f) => ({ ...f, anneeUniv: +e.target.value || currentYear, cohortId: '' }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Classe (cohorte) *</label>
                <select value={form.cohortId} onChange={(e) => setForm((f) => ({ ...f, cohortId: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" required disabled={!form.formationId || !form.campusId}>
                  <option value="">— Choisir —</option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>{c.nom}{c.section ? ` – ${c.section}` : ''}</option>
                  ))}
                </select>
                {form.formationId && form.anneeUniv && form.campusId && cohorts.length === 0 && (
                  <p className="mt-1 text-xs text-amber-700">Aucune cohorte pour cette formation, année et campus. Créez-en une dans <Link href="/dashboard/scolarite/inscriptions" className="underline">Inscriptions</Link> (cohortes).</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Email (optionnel)</label>
                <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Sinon, un email technique sera généré" />
              </div>
            </div>
          </section>
        )}

        <div className="mt-8 flex flex-wrap gap-3 justify-between">
          <div>
            {step > 1 && (
              <button type="button" onClick={() => setStep(step - 1)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300">
                Précédent
              </button>
            )}
          </div>
          <div className="flex gap-3">
            {step < 4 ? (
              <button type="button" onClick={goNext} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700">
                Suivant
              </button>
            ) : (
              <>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                  {submitting ? 'Inscription...' : 'Valider l\'inscription'}
                </button>
                <Link href="/dashboard/scolarite/etudiants" className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 inline-block">
                  Annuler
                </Link>
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
