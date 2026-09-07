import { Navigate } from 'react-router-dom'

/** Ancienne URL — redirigée vers la page Factures unifiée. */
export default function ResponsableDemandesProforma() {
  return <Navigate to="/mon-etablissement/factures" replace />
}
