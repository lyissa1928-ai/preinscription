/**
 * Niveaux d'étude dynamiques (CRUD admin) — utilisés par formations, filtres, rapports, chatbot.
 */

const DEFAULT_NIVEAUX = [
  { code: 'BT', libelle: 'BT', ordre: 10 },
  { code: 'BTS', libelle: 'BTS', ordre: 20 },
  { code: 'L1', libelle: 'L1', ordre: 30 },
  { code: 'L2', libelle: 'L2', ordre: 40 },
  { code: 'L3', libelle: 'L3', ordre: 50 },
  { code: 'LP', libelle: 'Licence professionnelle', ordre: 55 },
  { code: 'M1', libelle: 'M1', ordre: 60 },
  { code: 'M2', libelle: 'M2', ordre: 70 },
  { code: 'MP', libelle: 'Master professionnel', ordre: 75 },
  { code: 'DOC', libelle: 'Doctorat', ordre: 80 },
];

function ensureNiveauxCollection(db) {
  if (!Array.isArray(db.get('niveaux_etude').value())) {
    db.set('niveaux_etude', []).write();
  }
  const nextIds = db.get('_nextId').value() || {};
  if (nextIds.niveaux_etude == null) {
    db.set('_nextId.niveaux_etude', 1).write();
  }
}

function seedDefaultNiveaux(db) {
  ensureNiveauxCollection(db);
  const existing = db.get('niveaux_etude').value() || [];
  if (existing.length > 0) return { seeded: 0, total: existing.length };

  const now = new Date().toISOString();
  let nextId = db.get('_nextId.niveaux_etude').value() || 1;
  const rows = DEFAULT_NIVEAUX.map((n) => {
    const row = {
      id: nextId++,
      code: n.code,
      libelle: n.libelle,
      ordre: n.ordre,
      actif: true,
      created_at: now,
      updated_at: now,
    };
    return row;
  });
  db.set('niveaux_etude', rows).write();
  db.set('_nextId.niveaux_etude', nextId).write();
  return { seeded: rows.length, total: rows.length };
}

function listNiveaux(db, { actifsOnly = false } = {}) {
  ensureNiveauxCollection(db);
  let list = [...(db.get('niveaux_etude').value() || [])];
  if (actifsOnly) list = list.filter((n) => n.actif !== false);
  list.sort((a, b) => (a.ordre || 0) - (b.ordre || 0) || String(a.libelle).localeCompare(String(b.libelle)));
  return list;
}

function findNiveauByLibelleOrCode(db, value) {
  if (value == null || String(value).trim() === '') return null;
  const v = String(value).trim().toLowerCase();
  return (db.get('niveaux_etude').value() || []).find(
    (n) =>
      String(n.libelle || '').trim().toLowerCase() === v
      || String(n.code || '').trim().toLowerCase() === v,
  ) || null;
}

function isNiveauActifValide(db, value) {
  const n = findNiveauByLibelleOrCode(db, value);
  return !!(n && n.actif !== false);
}

function normalizeNiveauLibelle(db, value) {
  const n = findNiveauByLibelleOrCode(db, value);
  return n ? n.libelle : (value != null ? String(value).trim() : null);
}

module.exports = {
  DEFAULT_NIVEAUX,
  ensureNiveauxCollection,
  seedDefaultNiveaux,
  listNiveaux,
  findNiveauByLibelleOrCode,
  isNiveauActifValide,
  normalizeNiveauLibelle,
};
