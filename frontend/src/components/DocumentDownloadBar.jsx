import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { downloadDocumentPdf } from '../utils/downloadDocumentPdf'

/**
 * Barre d’actions documents : retour + téléchargement PDF + envoi e-mail optionnel (staff).
 */
export default function DocumentDownloadBar({
  documentRef,
  filename,
  backTo = -1,
  backHref,
  backFallback,
  backLabel = '← Retour',
  primaryColor = '#1e40af',
  className = 'mx-auto mb-5 flex max-w-[210mm] flex-wrap items-center justify-between gap-3',
  /** Callback async pour envoi manuel par e-mail (staff uniquement). */
  onSendEmail,
  sendEmailLabel = 'Envoyer par e-mail',
}) {
  const [busy, setBusy] = useState(false)
  const [emailBusy, setEmailBusy] = useState(false)
  const navigate = useNavigate()

  const handleDownload = async () => {
    const el = documentRef?.current
    if (!el) {
      toast.error('Document introuvable.')
      return
    }
    setBusy(true)
    try {
      await downloadDocumentPdf(el, filename)
      toast.success('PDF téléchargé.')
    } catch {
      toast.error('Impossible de générer le PDF.')
    } finally {
      setBusy(false)
    }
  }

  const handleSmartBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(backFallback || '/dashboard')
    }
  }

  const handleSendEmail = async () => {
    if (!onSendEmail || emailBusy) return
    setEmailBusy(true)
    try {
      await onSendEmail()
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Envoi impossible.')
    } finally {
      setEmailBusy(false)
    }
  }

  const backClass =
    'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'

  return (
    <div className={`no-print ${className}`}>
      {backHref != null ? (
        <Link to={backHref} className={backClass}>
          {backLabel}
        </Link>
      ) : backTo === -1 || backFallback != null ? (
        <button type="button" onClick={handleSmartBack} className={backClass}>
          {backLabel}
        </button>
      ) : (
        <Link to={backTo} className={backClass}>
          {backLabel}
        </Link>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {typeof onSendEmail === 'function' ? (
          <button
            type="button"
            disabled={emailBusy}
            onClick={handleSendEmail}
            className="rounded-lg border-2 border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            {emailBusy ? 'Envoi…' : sendEmailLabel}
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={handleDownload}
          className="rounded-lg px-5 py-2.5 text-sm font-bold text-white shadow-md disabled:opacity-50"
          style={{ backgroundColor: primaryColor }}
        >
          {busy ? 'Préparation…' : 'Télécharger'}
        </button>
      </div>
    </div>
  )
}
