const LABELS = {
  en_attente: 'En attente',
  en_cours: 'En cours d\'examen',
  accepte: 'Accepté',
  refuse: 'Refusé'
}

export default function StatutBadge({ statut }) {
  return (
    <span className={`badge-${statut}`}>
      {LABELS[statut] || statut}
    </span>
  )
}
