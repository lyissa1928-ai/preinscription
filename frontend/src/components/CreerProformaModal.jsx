import { useNavigate } from 'react-router-dom'

/**
 * Choix du type de facture puis redirection vers le guichet.
 */
export default function CreerProformaModal({ open, onClose }) {
  const navigate = useNavigate()

  if (!open) return null

  const go = (nature) => {
    onClose?.()
    navigate(`/responsable/preinscription-guichet?nature=${nature}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900">Nouvelle facture</h3>
        <p className="mt-1.5 text-sm text-gray-500">
          Choisissez le type de document. L’en-tête affichera « Facture proforma » ou « Facture définitive ».
        </p>
        <div className="mt-4 grid gap-2">
          <button
            type="button"
            className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-left hover:bg-orange-100"
            onClick={() => go('proforma')}
          >
            <span className="block text-sm font-bold text-orange-900">Facture proforma</span>
            <span className="mt-0.5 block text-xs text-orange-800/80">Devis / document indicatif (non contractuel).</span>
          </button>
          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left hover:bg-slate-100"
            onClick={() => go('definitive')}
          >
            <span className="block text-sm font-bold text-slate-900">Facture définitive</span>
            <span className="mt-0.5 block text-xs text-slate-600">Facture ferme — en-tête « Facture définitive ».</span>
          </button>
        </div>
        <div className="mt-4 flex justify-end">
          <button type="button" className="btn-secondary text-sm" onClick={onClose}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}
