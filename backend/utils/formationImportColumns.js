/**
 * Colonnes d’import / template formations (aligné frontend formationGridSchema.js).
 */

const DATA_COLUMNS = [
  { key: 'titre', label: 'Nom de la formation', required: true },
  { key: 'niveau', label: 'Niveau' },
  { key: 'niveau_requis', label: 'Niveau requis' },
  { key: 'duree_mois', label: 'Nombre de mois', required: true },
  { key: 'frais_inscription', label: 'Inscription' },
  { key: 'mensualite', label: 'Mensualité' },
  { key: 'frais_soutenance', label: 'Soutenance' },
  { key: 'frais_bibliotheque', label: 'Bibliothèque' },
  { key: 'frais_epi', label: 'EPI' },
  { key: 'description', label: 'Description' },
  { key: 'actif', label: 'Actif' },
];

const ALIASES = {
  titre: ['titre', 'intitule', 'intitulé', 'nom de la formation', 'nom formation', 'formation'],
  niveau: ['niveau'],
  niveau_requis: ['niveau_requis', 'niveau requis', 'niv. requis', 'niv requis'],
  duree_mois: ['duree_mois', 'duree mois', 'nombre de mois', 'mois', 'nb mois'],
  frais_inscription: ['frais_inscription', 'inscription', 'frais d inscription', "frais d'inscription"],
  mensualite: ['mensualite', 'mensualité', 'mens.'],
  frais_soutenance: ['frais_soutenance', 'soutenance'],
  frais_bibliotheque: ['frais_bibliotheque', 'bibliotheque', 'bibliothèque', 'biblio'],
  frais_epi: ['frais_epi', 'epi'],
  description: ['description'],
  actif: ['actif', 'active', 'enabled'],
};

function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, ' ')
    .replace(/\s+/g, ' ');
}

function resolveHeaderToKey(header, customLabels = []) {
  const n = normalizeHeader(header);
  if (!n) return null;
  if (DATA_COLUMNS.some((c) => c.key === n || c.key === n.replace(/\s/g, '_'))) {
    const k = n.replace(/\s/g, '_');
    if (DATA_COLUMNS.some((c) => c.key === k)) return k;
    if (DATA_COLUMNS.some((c) => c.key === n)) return n;
  }
  for (const col of DATA_COLUMNS) {
    if (col.key === n) return col.key;
    const aliases = ALIASES[col.key] || [];
    if (aliases.some((a) => normalizeHeader(a) === n)) return col.key;
    if (normalizeHeader(col.label) === n) return col.key;
    if (normalizeHeader(`${col.label} *`) === n) return col.key;
  }
  for (const c of customLabels) {
    if (c?.key && normalizeHeader(c.label) === n) return c.key;
    if (c?.key && normalizeHeader(`${c.label} *`) === n) return c.key;
  }
  return null;
}

function defaultTemplateColumns() {
  return DATA_COLUMNS.map((c) => ({
    key: c.key,
    label: c.required ? `${c.label} *` : c.label,
  }));
}

/**
 * Parse query/body columns JSON : [{key,label}]
 */
function parseCustomColumns(raw) {
  if (!raw) return defaultTemplateColumns();
  let arr = raw;
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw);
    } catch {
      return defaultTemplateColumns();
    }
  }
  if (!Array.isArray(arr) || arr.length === 0) return defaultTemplateColumns();
  const allowed = new Set(DATA_COLUMNS.map((c) => c.key));
  const out = [];
  arr.forEach((item) => {
    const key = String(item?.key || '').trim();
    if (!allowed.has(key)) return;
    const def = DATA_COLUMNS.find((c) => c.key === key);
    const label = String(item?.label || def.label).trim() || def.label;
    out.push({
      key,
      label: def.required && !label.includes('*') ? `${label} *` : label,
    });
  });
  // Toujours garder titre + duree_mois
  ['titre', 'duree_mois'].forEach((reqKey) => {
    if (!out.some((c) => c.key === reqKey)) {
      const def = DATA_COLUMNS.find((c) => c.key === reqKey);
      out.unshift({ key: reqKey, label: `${def.label} *` });
    }
  });
  return out.length ? out : defaultTemplateColumns();
}

module.exports = {
  DATA_COLUMNS,
  ALIASES,
  normalizeHeader,
  resolveHeaderToKey,
  defaultTemplateColumns,
  parseCustomColumns,
};
