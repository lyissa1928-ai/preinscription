'use client';

import { useState } from 'react';
import { api, apiUpload, downloadFile } from '@/lib/api';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/contexts/ToastContext';
import { BackLink } from '@/components/ui/back-link';
import { canImportFormations } from '@/config/rbac';

type ImportRow = {
  filiereCode: string;
  filiereNom: string;
  formationCode: string;
  formationNom: string;
  cycle: string;
  dureeSemestres: number;
  maquetteAnneeRef: number;
  semestreNumero: number;
  semestreCreditsEcts: number;
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

type Preview = { rows: ImportRow[]; totalErrors: number; canImport: boolean };

export default function ImportFormationsPage() {
  const { role: userRole, loading: roleLoading } = useUserRole();
  const toast = useToast();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number } | null>(null);
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const canWrite = canImportFormations(userRole);

  const handleDownloadTemplate = () => {
    downloadFile('/formations/import/template', 'template-formations.xlsx');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setLoadedFileName(file.name);
    setLoading(true);
    setPreview(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await apiUpload<Preview>('/formations/import/preview', formData);
      if (data?.rows) {
        setPreview(data);
      } else {
        setUploadError('Réponse serveur invalide (aucune donnée à prévisualiser).');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors du chargement du fichier.';
      setUploadError(msg);
      setLoadedFileName(null);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const validateRow = (r: ImportRow): string[] => {
    const err: string[] = [];
    if (!String(r.filiereCode).trim()) err.push('Code filière requis');
    if (!String(r.filiereNom).trim()) err.push('Nom filière requis');
    if (!String(r.formationCode).trim()) err.push('Code formation requis');
    if (!String(r.formationNom).trim()) err.push('Nom formation requis');
    if (!['L', 'M', 'D'].includes(String(r.cycle))) err.push('Cycle L, M ou D');
    if (!String(r.ueCode).trim()) err.push('Code UE requis');
    if (!String(r.ueNom).trim()) err.push('Nom UE requis');
    if (!String(r.ecCode).trim()) err.push('Code EC requis');
    if (!String(r.ecNom).trim()) err.push('Nom EC requis');
    return err;
  };

  const updateRow = (idx: number, field: keyof ImportRow, value: string | number) => {
    if (!preview) return;
    const rows = [...preview.rows];
    rows[idx] = { ...rows[idx], [field]: value, errors: [] };
    rows[idx].errors = validateRow(rows[idx]);
    const totalErrors = rows.reduce((s, r) => s + (r.errors?.length || 0), 0);
    setPreview({ ...preview, rows, totalErrors, canImport: totalErrors === 0 });
  };

  const handleConfirm = async () => {
    if (!preview || !preview.canImport) return;
    setConfirming(true);
    try {
      const res = await api<{ created: number; updated: number }>('/formations/import/confirm', {
        method: 'POST',
        body: JSON.stringify({ rows: preview.rows }),
      });
      setResult(res);
      setPreview(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setConfirming(false);
    }
  };

  if (roleLoading) {
    return (
      <div>
        <BackLink href="/dashboard/scolarite/formations">← Retour</BackLink>
        <p className="mt-4 text-slate-500">Chargement...</p>
      </div>
    );
  }
  if (!canWrite) {
    return (
      <div>
        <BackLink href="/dashboard/scolarite/formations">← Retour</BackLink>
        <p className="mt-4 text-red-600">Vous n&apos;avez pas les droits pour importer des formations (réservé à Pédagogie / Admin).</p>
      </div>
    );
  }

  return (
    <div>
      <BackLink href="/dashboard/scolarite/formations">← Retour aux formations</BackLink>
      <h1 className="text-2xl font-bold text-slate-800 mt-2">Import filières et formations par Excel</h1>
      <p className="text-slate-600 mt-1">Le template inclut filière, formation, semestre, maquette, UE et EC. Téléchargez, remplissez, puis chargez pour prévisualiser.</p>

      <div className="mt-6 flex flex-wrap gap-4 items-center">
        <button
          onClick={handleDownloadTemplate}
          className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800"
        >
          Télécharger le template Excel
        </button>
        <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer inline-block">
          Choisir un fichier Excel
          <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" disabled={loading} />
        </label>
        {loadedFileName && (
          <span className="text-sm text-slate-600 font-medium">
            Fichier choisi : <span className="text-slate-800">{loadedFileName}</span>
          </span>
        )}
      </div>

      {loading && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 font-medium">Analyse du fichier en cours…</p>
          <p className="text-sm text-blue-700 mt-1">Vous verrez la prévisualisation des données ci-dessous avant de valider.</p>
        </div>
      )}

      {uploadError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium">Erreur</p>
          <p className="text-sm text-red-700 mt-1">{uploadError}</p>
        </div>
      )}

      {result && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="font-medium text-green-800">Import terminé</p>
          <p className="text-sm text-green-700 mt-1">{result.created} créé(s), {result.updated} mis à jour</p>
        </div>
      )}

      {preview && (
        <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <h2 className="font-semibold text-slate-800 mb-1">Fichier chargé — prévisualisation avant validation</h2>
          <p className="text-sm text-slate-600 mb-4">Vérifiez les données ci-dessous, corrigez les erreurs éventuelles, puis cliquez sur « Valider l&apos;import ».</p>
          <div className="flex justify-between items-center mb-4">
            <span className="text-slate-700">{preview.rows.length} ligne(s) à importer</span>
            {preview.totalErrors > 0 ? (
              <span className="text-amber-600 font-medium">{preview.totalErrors} erreur(s) à corriger</span>
            ) : (
              <span className="text-green-600 font-medium">Prêt à importer</span>
            )}
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 sticky top-0">
                <tr>
                  <th className="text-left p-2">Ligne</th>
                  <th className="text-left p-2">Filière</th>
                  <th className="text-left p-2">Formation</th>
                  <th className="text-left p-2">Cycle</th>
                  <th className="text-left p-2">Maq.</th>
                  <th className="text-left p-2">Sem.</th>
                  <th className="text-left p-2">UE</th>
                  <th className="text-left p-2">EC</th>
                  <th className="text-left p-2">Erreurs</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, idx) => (
                  <tr key={idx} className={row.errors?.length ? 'bg-red-50' : 'hover:bg-slate-50'}>
                    <td className="p-2">{row.rowIndex}</td>
                    <td className="p-2">
                      <input
                        value={row.filiereCode || ''}
                        onChange={(e) => updateRow(idx, 'filiereCode', e.target.value)}
                        className="w-20 px-1 border rounded"
                      />
                      <input
                        value={row.filiereNom || ''}
                        onChange={(e) => updateRow(idx, 'filiereNom', e.target.value)}
                        className="w-24 px-1 border rounded mt-1"
                        placeholder="Nom filière"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        value={row.formationCode}
                        onChange={(e) => updateRow(idx, 'formationCode', e.target.value)}
                        className="w-24 px-1 py-0.5 border rounded text-xs"
                      />
                      <input
                        value={row.formationNom}
                        onChange={(e) => updateRow(idx, 'formationNom', e.target.value)}
                        className="w-32 px-1 py-0.5 border rounded text-xs ml-1"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={row.cycle}
                        onChange={(e) => updateRow(idx, 'cycle', e.target.value)}
                        className="px-1 py-0.5 border rounded text-xs"
                      >
                        <option value="L">L</option>
                        <option value="M">M</option>
                        <option value="D">D</option>
                      </select>
                    </td>
                    <td className="p-2">{row.maquetteAnneeRef}</td>
                    <td className="p-2">{row.semestreNumero}</td>
                    <td className="p-2">{row.ueCode} — {row.ueNom}</td>
                    <td className="p-2">{row.ecCode} — {row.ecNom}</td>
                    <td className="p-2 text-red-600 text-xs">{row.errors?.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex gap-4">
            <button
              onClick={handleConfirm}
              disabled={!preview.canImport || confirming}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {confirming ? 'Import en cours...' : 'Valider l\'import'}
            </button>
            <button
              onClick={() => { setPreview(null); setLoadedFileName(null); setUploadError(null); }}
              className="px-4 py-2 bg-slate-400 text-white rounded-lg hover:bg-slate-500"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
