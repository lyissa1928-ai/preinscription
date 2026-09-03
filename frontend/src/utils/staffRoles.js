export const ROLE_ADMIN_ETABLISSEMENT = 'admin_etablissement'

export const ROLES_STAFF_LABELS = {
  admin: 'Administrateur plateforme',
  admin_etablissement: 'Administrateur établissement',
  responsable: 'Responsable pédagogique',
  responsable_fad: 'Responsable FAD',
  agent_fad: 'Agent FAD',
  agent_admin: 'Agent administratif',
  comptable: 'Comptable',
  controleur_qualite: 'Contrôleur qualité',
}

export function isAdminEtablissement(user) {
  return user?.role === ROLE_ADMIN_ETABLISSEMENT
}

export function isPlatformAdmin(user) {
  return user?.role === 'admin'
}

export function canManageEtabTeam(user) {
  return isPlatformAdmin(user) || isAdminEtablissement(user)
}

/** Rôles proposés à la création selon l’acteur. */
export function rolesCreatablesForActor(user, allStaffRoles) {
  if (isPlatformAdmin(user)) {
    // L’admin établissement se désigne via l’onglet dédié (unicité).
    return allStaffRoles.filter((r) => r.val !== 'admin' && r.val !== 'admin_etablissement')
  }
  if (isAdminEtablissement(user)) {
    return allStaffRoles.filter((r) =>
      ['responsable', 'responsable_fad', 'agent_fad', 'agent_admin', 'comptable', 'controleur_qualite'].includes(r.val)
    )
  }
  if (user?.role === 'responsable_fad') {
    return allStaffRoles.filter((r) => r.val === 'agent_fad')
  }
  return []
}
