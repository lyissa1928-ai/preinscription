/**
 * Colonnes d’import / template formations (aligné frontend formationGridSchema.js).
 */

const DATA_COLUMNS = [
  { key: 'titre', label: 'Intitulé de la formation', required: true },
  { key: 'niveau', label: 'Niveau', required: true },
  { key: 'niveau_requis', label: 'Niveau exigé' },
  { key: 'nombre_annees', label: "Nombre d'années" },
  { key: 'duree_mois', label: 'Durée mensualité', required: true },
  { key: 'mensualite', label: 'Mensualité' },
  { key: 'frais_inscription', label: "Frais d'inscription" },
  { key: 'frais_bibliotheque', label: 'Abonnement bibliothèque' },
  { key: 'frais_epi', label: 'EPI' },
  { key: 'description', label: 'Description' },
  { key: 'debouches', label: 'Débouchés' },
  { key: 'actif', label: 'Actif' },
];

const ALIASES = {
  titre: ['titre', 'intitule', 'intitulé', 'nom de la formation', 'nom formation', 'formation'],
  niveau: ['niveau'],
  niveau_requis: ['niveau_requis', 'niveau requis', 'niveau exige', 'niveau exigé', 'niv. requis'],
  nombre_annees: ['nombre_annees', "nombre d'annees", "nombre d'années", 'nb annees', 'annees', 'années'],
  duree_mois: ['duree_mois', 'duree mois', 'duree mensualite', 'durée mensualité', 'nombre de mois', 'mois', 'nb mois'],
  mensualite: ['mensualite', 'mensualité', 'mens.'],
  frais_inscription: ['frais_inscription', 'inscription', 'frais d inscription', "frais d'inscription"],
  frais_bibliotheque: ['frais_bibliotheque', 'bibliotheque', 'bibliothèque', 'abonnement bibliotheque', 'abonnement bibliothèque', 'biblio'],
  frais_epi: ['frais_epi', 'epi'],
  description: ['description'],
  debouches: ['debouches', 'débouchés', 'debouche', 'débouché'],
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
  ['titre', 'duree_mois', 'niveau'].forEach((reqKey) => {
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
