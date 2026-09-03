/**
 * Schéma des colonnes grille + templates formations (présentiel / en ligne).
 * Les libellés sont personnalisables ; les clés techniques restent stables pour l’import.
 */

export const FORMATION_DATA_COLUMNS = [
  {
    key: 'titre',
    label: 'Nom de la formation',
    required: true,
    type: 'text',
    width: 'min-w-[12rem]',
    help: 'Nom officiel de la formation (ex. Licence 1 Génie Civil). Ancien libellé : « Intitulé ».',
    aliases: ['titre', 'intitule', 'intitulé', 'nom de la formation', 'nom formation', 'formation'],
  },
  {
    key: 'niveau',
    label: 'Niveau d’étude',
    required: true,
    type: 'text',
    width: 'min-w-[7rem]',
    help: 'Niveau dynamique (BT, BTS, L1, L2…). Géré dans Admin → Niveaux d’étude.',
    aliases: ['niveau', 'niveau etude', "niveau d'etude", 'niveau d’étude'],
  },
  {
    key: 'niveau_requis',
    label: 'Niveau requis',
    type: 'text',
    width: 'min-w-[7rem]',
    aliases: ['niveau_requis', 'niveau requis', 'niv. requis', 'niv requis'],
  },
  {
    key: 'duree_mois',
    label: 'Nombre de mois',
    required: true,
    type: 'number',
    width: 'min-w-[5rem]',
    help: 'Nombre de mensualités (ex. 10). Total mensualités = mois × mensualité.',
    aliases: ['duree_mois', 'duree mois', 'nombre de mois', 'mois', 'nb mois'],
  },
  {
    key: 'frais_inscription',
    label: 'Inscription',
    type: 'number',
    width: 'min-w-[5.5rem]',
    aliases: ['frais_inscription', 'inscription', 'frais d inscription', "frais d'inscription"],
  },
  {
    key: 'mensualite',
    label: 'Mensualité',
    type: 'number',
    width: 'min-w-[5.5rem]',
    aliases: ['mensualite', 'mensualité', 'mens.'],
  },
  {
    key: 'frais_soutenance',
    label: 'Soutenance',
    type: 'number',
    width: 'min-w-[5rem]',
    aliases: ['frais_soutenance', 'soutenance'],
  },
  {
    key: 'frais_bibliotheque',
    label: 'Bibliothèque',
    type: 'number',
    width: 'min-w-[5.5rem]',
    aliases: ['frais_bibliotheque', 'bibliotheque', 'bibliothèque', 'biblio'],
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
    help: 'Présentation de la formation (contenu pédagogique, objectifs, etc.)',
  },
  {
    key: 'debouches',
    label: 'Débouchés professionnels',
    type: 'text',
    width: 'min-w-[10rem]',
    aliases: ['debouches', 'débouchés', 'debouches professionnels', 'débouchés professionnels', 'emplois', 'metiers'],
    help: 'Métiers et secteurs accessibles après la formation.',
  },
  {
    key: 'actif',
    label: 'Actif',
    type: 'text',
    width: 'min-w-[4rem]',
    templateOnly: false,
    aliases: ['actif', 'active', 'enabled'],
  },
]

/** Colonnes calculées (affichage grille uniquement, absentes du fichier Excel d’import). */
export const FORMATION_COMPUTED_COLUMNS = [
  { key: '_total_mens', label: 'Total mensualités', computed: true, width: 'min-w-[6rem]' },
  { key: '_forfait', label: 'Forfait annuel', computed: true, width: 'min-w-[6rem]' },
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
        }))
      )
    )
  } catch {
    /* ignore quota */
  }
}

export function visibleDataColumns(cols) {
  return (cols || []).filter((c) => c.visible !== false)
}

/** Colonnes exportées dans le template Excel (données saisissables). */
export function templateColumnsFromState(cols) {
  return visibleDataColumns(cols).map((c) => ({
    key: c.key,
    label: c.required ? `${c.label} *` : c.label,
  }))
}

export function resolveHeaderToKey(header, customLabels = []) {
  const n = normalizeHeader(header)
  if (!n) return null
  // Clé technique exacte
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
    duree_mois: '',
    frais_inscription: '',
    mensualite: '',
    frais_soutenance: '',
    frais_bibliotheque: '',
    frais_epi: '',
    description: '',
    debouches: '',
    actif: 'true',
  }
}

/** Convertit une formation API en ligne de grille (édition lot). */
export function formationToGridRow(f) {
  return {
    _tmpId: f?.id != null ? `existing-${f.id}` : `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    id: f?.id ?? null,
    filiere_id: String(f?.filiere_id || ''),
    type: f?.type === 'en_ligne' ? 'en_ligne' : 'presentiel',
    titre: f?.titre || '',
    niveau: f?.niveau || '',
    niveau_requis: f?.niveau_requis || '',
    duree_mois: f?.duree_mois != null && f?.duree_mois !== '' ? String(f.duree_mois) : '',
    frais_inscription: String(f?.frais_inscription ?? ''),
    mensualite: String(f?.mensualite ?? ''),
    frais_soutenance: String(f?.frais_soutenance ?? ''),
    frais_bibliotheque: String(f?.frais_bibliotheque ?? ''),
    frais_epi: String(f?.frais_epi ?? ''),
    description: f?.description || '',
    debouches: f?.debouches || '',
    actif: f?.actif === false ? 'false' : 'true',
  }
}
