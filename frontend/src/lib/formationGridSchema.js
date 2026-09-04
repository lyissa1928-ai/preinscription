/**
 * Schéma colonnes grille + templates formations.
 * Aligné formulaire individuel et facture (solde / total).
 */

export const FORMATION_DATA_COLUMNS = [
  {
    key: 'titre',
    label: 'Intitulé de la formation',
    required: true,
    type: 'text',
    width: 'min-w-[12rem]',
    help: 'Nom officiel de la formation.',
    aliases: ['titre', 'intitule', 'intitulé', 'nom de la formation', 'nom formation', 'formation'],
  },
  {
    key: 'niveau',
    label: 'Niveau',
    required: true,
    type: 'text',
    width: 'min-w-[7rem]',
    help: 'Niveau (BT, BTS, L1…). Géré dans Admin → Niveaux d’étude.',
    aliases: ['niveau', 'niveau etude', "niveau d'etude", 'niveau d’étude'],
  },
  {
    key: 'niveau_requis',
    label: 'Niveau exigé',
    type: 'text',
    width: 'min-w-[7rem]',
    aliases: ['niveau_requis', 'niveau requis', 'niveau exige', 'niveau exigé', 'niv. requis', 'niv requis'],
  },
  {
    key: 'nombre_annees',
    label: "Nombre d'années",
    type: 'number',
    width: 'min-w-[5rem]',
    help: 'Durée du cycle en années (ex. 2, 3).',
    aliases: ['nombre_annees', "nombre d'annees", "nombre d'années", 'nb annees', 'annees', 'années'],
  },
  {
    key: 'duree_mois',
    label: 'Durée mensualité',
    required: true,
    type: 'number',
    width: 'min-w-[5.5rem]',
    help: 'Nombre de mois de mensualité. Solde = mensualité × durée.',
    aliases: ['duree_mois', 'duree mois', 'duree mensualite', 'durée mensualité', 'nombre de mois', 'mois', 'nb mois'],
  },
  {
    key: 'mensualite',
    label: 'Mensualité',
    type: 'number',
    width: 'min-w-[5.5rem]',
    aliases: ['mensualite', 'mensualité', 'mens.'],
  },
  {
    key: 'frais_inscription',
    label: "Frais d'inscription",
    type: 'number',
    width: 'min-w-[6rem]',
    aliases: ['frais_inscription', 'inscription', 'frais d inscription', "frais d'inscription"],
  },
  {
    key: 'frais_bibliotheque',
    label: 'Abonnement bibliothèque',
    type: 'number',
    width: 'min-w-[6.5rem]',
    aliases: ['frais_bibliotheque', 'bibliotheque', 'bibliothèque', 'abonnement bibliotheque', 'abonnement bibliothèque', 'biblio'],
  },
  {
    key: 'frais_epi',
    label: 'EPI',
    type: 'number',
    width: 'min-w-[4.5rem]',
    aliases: ['frais_epi', 'epi'],
  },
  {
    key: 'description',
    label: 'Description',
    type: 'text',
    width: 'min-w-[10rem]',
    aliases: ['description'],
    help: 'Présentation de la formation (contenu, objectifs…).',
  },
  {
    key: 'debouches',
    label: 'Débouchés',
    type: 'text',
    width: 'min-w-[10rem]',
    aliases: ['debouches', 'débouchés', 'debouche', 'débouché', 'debouches professionnels', 'emplois', 'metiers'],
    help: 'Métiers et secteurs accessibles après la formation.',
  },
  {
    key: 'actif',
    label: 'Actif',
    type: 'text',
    width: 'min-w-[4rem]',
    aliases: ['actif', 'active', 'enabled'],
  },
]

/** Colonnes calculées (grille uniquement). */
export const FORMATION_COMPUTED_COLUMNS = [
  { key: '_solde', label: 'Solde', computed: true, width: 'min-w-[6rem]', help: 'Mensualité × durée mensualité' },
  { key: '_total', label: 'Total', computed: true, width: 'min-w-[6rem]', help: 'Solde + bibliothèque + EPI' },
]

const STORAGE_PREFIX = 'uniportail-formation-grid-cols'

function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, ' ')
    .replace(/\s+/g, ' ')
}

export function defaultColumnState() {
  return FORMATION_DATA_COLUMNS.map((c) => ({
    key: c.key,
    label: c.label,
    visible: true,
    required: !!c.required,
    type: c.type,
    width: c.width,
    help: c.help || '',
  }))
}

export function loadColumnState(etabId) {
  const defaults = defaultColumnState()
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}:${etabId || 'global'}`)
    if (!raw) return defaults
    const saved = JSON.parse(raw)
    if (!Array.isArray(saved)) return defaults
    const byKey = Object.fromEntries(saved.map((x) => [x.key, x]))
    return defaults.map((d) => {
      const s = byKey[d.key]
      if (!s) return d
      return {
        ...d,
        label: String(s.label || d.label).trim() || d.label,
        visible: s.visible === false ? false : true,
      }
    })
  } catch {
    return defaults
  }
}

export function saveColumnState(etabId, cols) {
  try {
    localStorage.setItem(
      `${STORAGE_PREFIX}:${etabId || 'global'}`,
      JSON.stringify(
        cols.map((c) => ({
          key: c.key,
          label: c.label,
          visible: c.visible !== false,
        })),
      ),
    )
  } catch {
    /* ignore */
  }
}

export function visibleDataColumns(cols) {
  return (cols || []).filter((c) => c.visible !== false)
}

export function templateColumnsFromState(cols) {
  return visibleDataColumns(cols).map((c) => ({
    key: c.key,
    label: c.required ? `${c.label} *` : c.label,
  }))
}

export function resolveHeaderToKey(header, customLabels = []) {
  const n = normalizeHeader(header)
  if (!n) return null
  const byKey = FORMATION_DATA_COLUMNS.find((c) => c.key === n.replace(/\s/g, '_') || c.key === n)
  if (byKey) return byKey.key
  for (const c of FORMATION_DATA_COLUMNS) {
    if (c.key === n) return c.key
    if ((c.aliases || []).some((a) => normalizeHeader(a) === n)) return c.key
    if (normalizeHeader(c.label) === n) return c.key
    if (normalizeHeader(`${c.label} *`) === n) return c.key
  }
  for (const c of customLabels) {
    if (c?.key && normalizeHeader(c.label) === n) return c.key
    if (c?.key && normalizeHeader(`${c.label} *`) === n) return c.key
  }
  // Compat anciennes colonnes calculées / soutenance
  if (n === 'soutenance' || n === 'frais_soutenance') return null
  return null
}

export function emptyGridRow(filiereId, type) {
  return {
    _tmpId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    id: null,
    filiere_id: String(filiereId || ''),
    type: type || 'presentiel',
    titre: '',
    niveau: '',
    niveau_requis: '',
    nombre_annees: '',
    duree_mois: '',
    frais_inscription: '',
    mensualite: '',
    frais_bibliotheque: '',
    frais_epi: '',
    description: '',
    debouches: '',
    actif: 'true',
  }
}

export function formationToGridRow(f) {
  return {
    _tmpId: f?.id != null ? `existing-${f.id}` : `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    id: f?.id ?? null,
    filiere_id: String(f?.filiere_id || ''),
    type: f?.type === 'en_ligne' ? 'en_ligne' : 'presentiel',
    titre: f?.titre || '',
    niveau: f?.niveau || '',
    niveau_requis: f?.niveau_requis || '',
    nombre_annees: f?.nombre_annees != null && f?.nombre_annees !== '' ? String(f.nombre_annees) : '',
    duree_mois: f?.duree_mois != null && f?.duree_mois !== '' ? String(f.duree_mois) : '',
    frais_inscription: String(f?.frais_inscription ?? ''),
    mensualite: String(f?.mensualite ?? ''),
    frais_bibliotheque: String(f?.frais_bibliotheque ?? ''),
    frais_epi: String(f?.frais_epi ?? ''),
    description: f?.description || '',
    debouches: f?.debouches || '',
    actif: f?.actif === false ? 'false' : 'true',
  }
}
