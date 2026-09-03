/** Aligné sur backend/utils/staffRoles.js — permissions UI gestion membres. */
const ROLES_GERABLES_PAR_ADMIN_ETAB = [
  'responsable',
  'responsable_fad',
  'agent_fad',
  'agent_admin',
  'comptable',
  'controleur_qualite',
]

export function canCreateStaffAccount(user) {
  return (
    user?.role === 'admin'
    || user?.role === 'admin_etablissement'
    || user?.role === 'responsable_fad'
  )
}

export function creatableRoleOptions(user) {
  const agentFad = { val: 'agent_fad', label: 'Agent FAD' }
  const base = [
    { val: 'responsable', label: 'Responsable pédagogique' },
    { val: 'responsable_fad', label: 'Responsable FAD (formations à distance)' },
    agentFad,
    { val: 'agent_admin', label: 'Agent administratif' },
    { val: 'comptable', label: 'Comptable' },
    { val: 'controleur_qualite', label: 'Contrôleur qualité' },
  ]
  if (user?.role === 'admin') {
    return [...base, { val: 'admin_etablissement', label: 'Administrateur établissement' }]
  }
  if (user?.role === 'responsable_fad') {
    return [agentFad]
  }
  return base
}

export function canManageMembre(actor, target) {
  if (!actor || !target) return false
  if (actor.role === 'admin') return true
  if (actor.role === 'responsable_fad') {
    if (Number(actor.id) === Number(target.id)) return false
    return target.role === 'agent_fad'
  }
  if (actor.role !== 'admin_etablissement') return false
  if (Number(actor.id) === Number(target.id)) return false
  if (target.role === 'admin_etablissement' || target.role === 'admin') return false
  return ROLES_GERABLES_PAR_ADMIN_ETAB.includes(target.role)
}

export function roleLabel(role, rolesList) {
  return rolesList.find((r) => r.val === role)?.label || role
}
