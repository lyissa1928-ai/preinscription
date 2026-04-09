import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar'

/**
 * Ancienne route /lettre-demande/:id — le flux proforma ne fournit plus de lettre (facture + attestation uniquement).
 */
export default function RedirectLettreDemandeDeprecated() {
  const navigate = useNavigate()

  useEffect(() => {
    toast(
      'La lettre de préinscription n’est pas utilisée pour une demande de facture proforma. Utilisez la facture proforma et l’attestation depuis votre tableau de bord.',
      { duration: 5500 },
    )
    navigate('/dashboard', { replace: true })
  }, [navigate])

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />
      <div className="flex items-center justify-center py-24 px-4">
        <p className="text-sm text-slate-600">Redirection vers votre espace…</p>
      </div>
    </div>
  )
}
