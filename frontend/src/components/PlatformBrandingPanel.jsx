import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FaGlobe, FaImage, FaTrash, FaUpload } from 'react-icons/fa'
import { applySiteBranding } from '../utils/applySiteBranding'
import { mediaUrl } from '../utils/mediaUrl'

export default function PlatformBrandingPanel({ className = '' }) {
  const [cfg, setCfg] = useState(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  const load = () => {
    setLoading(true)
    return axios
      .get('/api/admin/site-config')
      .then(({ data }) => {
        setCfg(data)
        setName(data.platform_name || '')
        applySiteBranding(data)
      })
      .catch(() => toast.error('Impossible de charger la configuration plateforme.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const saveName = async () => {
    setSaving(true)
    try {
      const { data } = await axios.put('/api/admin/site-config', { platform_name: name.trim() })
      setCfg(data)
      applySiteBranding(data)
      toast.success('Nom de la plateforme enregistré.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Enregistrement impossible.')
    } finally {
      setSaving(false)
    }
  }

  const onFaviconFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('favicon', file)
      const { data } = await axios.post('/api/admin/site-config/favicon', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setCfg(data)
      applySiteBranding(data)
      toast.success(data.message || 'Favicon enregistré.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload favicon impossible.')
    } finally {
      setUploading(false)
    }
  }

  const removeFavicon = async () => {
    if (!window.confirm('Supprimer le favicon personnalisé ?')) return
    setUploading(true)
    try {
      const { data } = await axios.delete('/api/admin/site-config/favicon')
      setCfg(data)
      applySiteBranding({ ...data, favicon_url: '/favicon.svg' })
      toast.success(data.message || 'Favicon supprimé.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Suppression impossible.')
    } finally {
      setUploading(false)
    }
  }

  const faviconSrc = mediaUrl(cfg?.favicon_url) || '/favicon.svg'

  if (loading) {
    return (
      <div className={`rounded-2xl border border-slate-200 bg-white p-5 ${className}`}>
        <p className="text-sm text-slate-500">Chargement identité plateforme…</p>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden ${className}`}>
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-violet-50/50 px-5 py-4">
        <div className="flex items-center gap-2">
          <FaGlobe className="h-5 w-5 text-violet-600" aria-hidden />
          <h3 className="text-lg font-bold text-slate-900">Identité plateforme</h3>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Favicon affiché dans l’onglet du navigateur et nom du site.
        </p>
      </div>

      <div className="space-y-5 p-5">
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Nom affiché
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              type="text"
              className="input-field min-w-[220px] flex-1"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              placeholder="Préinscription Universitaire"
            />
            <button
              type="button"
              className="btn-primary"
              onClick={saveName}
              disabled={saving || !name.trim()}
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Favicon</p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2">
              <img src={faviconSrc} alt="" className="max-h-full max-w-full object-contain" />
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".ico,.png,.svg,.webp,.jpg,.jpeg,image/*"
                className="hidden"
                onChange={onFaviconFile}
              />
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                <FaUpload aria-hidden />
                {uploading ? 'Envoi…' : 'Choisir un fichier'}
              </button>
              {cfg?.favicon_url && (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  onClick={removeFavicon}
                  disabled={uploading}
                >
                  <FaTrash aria-hidden />
                  Supprimer
                </button>
              )}
            </div>
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
            <FaImage className="mt-0.5 shrink-0" aria-hidden />
            Formats : .ico, .png, .svg, .webp (max 1 Mo). Servi via /uploads/platform/ — visible immédiatement après enregistrement.
          </p>
        </div>
      </div>
    </div>
  )
}
