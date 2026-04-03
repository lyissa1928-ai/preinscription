/**
 * Réponses API parfois mal typées ou enveloppées : évite les crashs .map et normalise les clés Prisma / snake_case.
 */

export function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object' && 'data' in (value as object) && Array.isArray((value as { data: unknown }).data)) {
    return (value as { data: T[] }).data;
  }
  return [];
}

export type FormationListItem = {
  id: string;
  code: string;
  nom: string;
  cycle: string;
  dureeSemestres?: number;
  structureManaged?: boolean;
  statut?: string;
  filiereId: string;
  filiere: { id: string; code: string; nom: string };
};

/** Extrait filiereId même si l’API renvoie filiere_id ou seulement filiere.id */
export function normalizeFormationListItem(raw: unknown): FormationListItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = o.id;
  if (typeof id !== 'string') return null;

  const filiereRaw = o.filiere;
  let filiere: { id: string; code: string; nom: string } = { id: '', code: '', nom: '' };
  if (filiereRaw && typeof filiereRaw === 'object') {
    const fr = filiereRaw as Record<string, unknown>;
    filiere = {
      id: typeof fr.id === 'string' ? fr.id : '',
      code: typeof fr.code === 'string' ? fr.code : '',
      nom: typeof fr.nom === 'string' ? fr.nom : '',
    };
  }

  const fid = o.filiereId ?? o.filiere_id;
  const filiereId = typeof fid === 'string' ? fid : filiere.id;
  if (!filiereId) return null;

  return {
    id,
    code: typeof o.code === 'string' ? o.code : '',
    nom: typeof o.nom === 'string' ? o.nom : '',
    cycle: typeof o.cycle === 'string' ? o.cycle : '',
    dureeSemestres: typeof o.dureeSemestres === 'number' ? o.dureeSemestres : typeof o.duree_semestres === 'number' ? o.duree_semestres : undefined,
    structureManaged: Boolean(o.structureManaged ?? o.structure_managed),
    statut: typeof o.statut === 'string' ? o.statut : undefined,
    filiereId,
    filiere: filiere.id ? filiere : { id: filiereId, code: filiere.code, nom: filiere.nom },
  };
}

export function normalizeFormationList(raw: unknown): FormationListItem[] {
  return asArray<unknown>(raw)
    .map((row) => normalizeFormationListItem(row))
    .filter((x): x is FormationListItem => x !== null);
}

export type FiliereListItem = {
  id: string;
  code: string;
  nom: string;
  verrouille?: boolean;
  statut?: string;
  formations?: { id: string; code: string; nom: string }[];
};

export function normalizeFiliereListItem(raw: unknown): FiliereListItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.code !== 'string' || typeof o.nom !== 'string') return null;
  let formations: { id: string; code: string; nom: string }[] | undefined;
  if (Array.isArray(o.formations)) {
    formations = o.formations
      .filter((x): x is Record<string, unknown> => x !== null && typeof x === 'object')
      .map((x) => ({
        id: typeof x.id === 'string' ? x.id : '',
        code: typeof x.code === 'string' ? x.code : '',
        nom: typeof x.nom === 'string' ? x.nom : '',
      }))
      .filter((x) => x.id);
  }
  return {
    id: o.id,
    code: o.code,
    nom: o.nom,
    verrouille: Boolean(o.verrouille),
    statut: typeof o.statut === 'string' ? o.statut : undefined,
    formations,
  };
}

export function normalizeFiliereList(raw: unknown): FiliereListItem[] {
  return asArray<unknown>(raw)
    .map((row) => normalizeFiliereListItem(row))
    .filter((x): x is FiliereListItem => x !== null);
}
