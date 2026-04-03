/** Normalise le rôle (casse, espaces, accents) pour comparaison avec les constantes RBAC. */
export function normalizeRole(role: string | null | undefined): string | null {
  if (role == null || typeof role !== 'string') return null;
  const t = role
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  if (!t) return null;
  return t.toUpperCase().replace(/\s+/g, '_');
}
