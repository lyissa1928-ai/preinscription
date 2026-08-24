import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Ancien modal court : redirige vers le formulaire guichet unifié
 * (même modèle que la préinscription étudiant + 3 documents).
 */
export default function CreerProformaModal({ open, onClose }) {
  const navigate = useNavigate()
  useEffect(() => {
    if (!open) return
    onClose?.()
    navigate('/responsable/preinscription-guichet')
  }, [open, navigate, onClose])
  return null
}
