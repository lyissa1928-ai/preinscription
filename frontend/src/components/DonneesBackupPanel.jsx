import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaCloudDownloadAlt, FaCloudUploadAlt, FaDatabase, FaInfoCircle, FaFileArchive } from 'react-icons/fa'

function filenameFromDisposition(header, fallback) {
  if (!header) return fallback
  const m = /filename="?([^";\n]+)"?/i.exec(header)
  return m?.[1] || fallback
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function DonneesBackupPanel({ className = '' }) {
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    axios
      .get('/api/auth/mes-donnees/manifest')
      .then(({ data }) => setInfo(data))
      .catch(() => toast.error('Impossible de charger les informations de sauvegarde.'))
      .finally(() => setLoading(false))
  }, [])

  const handleExport = async () => {
    if (!info?.exportUrl) return
    setExporting(true)
    try {
      const response = await axios.get(info.exportUrl, { responseType: 'blob' })
      const fallback = `uniportail-sauvegarde-${Date.now()}.zip`
      const name = filenameFromDisposition(response.headers['content-disposition'], fallback)
      triggerBlobDownload(response.data, name.endsWith('.zip') ? name : `${name}.zip`)
      toast.success('Archive ZIP téléchargée.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Export impossible.')
    } finally {
      setExporting(false)
    }
  }

  const handleRestoreFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !info?.restoreUrl) return
    if (!/\.zip$/i.test(file.name)) {
      toast.error('Seuls les fichiers .zip sont acceptés.')
      return
    }
    if (!window.confirm(
      'Restaurer cette archive ZIP ? Un backup automatique sera créé avant toute modification. Les données existantes en production ne seront pas effacées par une simple mise à jour — cette action fusionne ou remplace selon votre rôle.',
    )) return

    setRestoring(true)
    try {
      const fd = new FormData()
      fd.append('backup', file)
      fd.append('confirm', 'true')
      const { data } = await axios.post(info.restoreUrl, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success(data.message || 'Restauration terminée.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Restauration impossible.')
    } finally {
      setRestoring(false)
    }
  }

  if (loading) {
    return (
      <div className={`rounded-2xl border border-slate-200 bg-white p-5 ${className}`}>
        <p className="text-sm text-slate-500">Chargement des options de sauvegarde…</p>
      </div>
    )
  }

  if (!info) return null

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden ${className}`}>
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/40 px-5 py-4">
        <div className="flex items-center gap-2">
          <FaDatabase className="h-5 w-5 text-indigo-600" aria-hidden />
          <h3 className="text-lg font-bold text-slate-900">{info.title || 'Mes données'}</h3>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-800">
            <FaFileArchive className="h-3 w-3" aria-hidden />
            Format ZIP
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Téléchargez une archive .zip avant une mise à jour. Restaurez en important le même type de fichier .zip.
        </p>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Inclus dans le ZIP</p>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
            {(info.included || []).map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-emerald-500">✓</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Non inclus</p>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
            {(info.excluded || []).map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-amber-500">—</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {info.migrationNote && (
        <div className="mx-5 mb-4 flex gap-2 rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-blue-900">
          <FaInfoCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" aria-hidden />
          <p>{info.migrationNote}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4">
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || !info.exportUrl}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
        >
          <FaCloudDownloadAlt aria-hidden />
          {exporting ? 'Export ZIP…' : 'Télécharger (.zip)'}
        </button>

        {info.canRestore && info.restoreUrl && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              className="hidden"
              onChange={handleRestoreFile}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={restoring}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <FaCloudUploadAlt aria-hidden />
              {restoring ? 'Restauration…' : 'Restaurer (.zip)'}
            </button>
          </>
        )}

        {info.restoreHint && (
          <p className="w-full text-xs text-slate-500">{info.restoreHint}</p>
        )}
      </div>
    </div>
  )
}
